import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalaryAdvance, SalaryAdvanceStatus } from '../entities/salary-advance.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { CreateSalaryAdvanceDto } from './dto/create-salary-advance.dto';

@Injectable()
export class SalaryAdvancesService {
  constructor(
    @InjectRepository(SalaryAdvance)
    private readonly advanceRepo: Repository<SalaryAdvance>,
    @InjectRepository(OperatingExpense)
    private readonly expenseRepo: Repository<OperatingExpense>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
    private readonly dataSource: DataSource,
  ) {}

  async create(tenantId: string, dto: CreateSalaryAdvanceDto): Promise<SalaryAdvance> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('Empleado no encontrado');
    }

    let rate = dto.exchangeRate;
    if (!rate || rate <= 0) {
      const settings = await this.settingsRepo.findOne({ where: { tenantId } });
      let effectiveRate = settings?.exchangeRateBs ? Number(settings.exchangeRateBs) : 0;
      if (!effectiveRate || effectiveRate <= 0) {
        const globalSettings = await this.settingsRepo.findOne({ where: { id: 'GLOBAL' } });
        effectiveRate = globalSettings?.exchangeRateBs ? Number(globalSettings.exchangeRateBs) : 0;
      }
      rate = effectiveRate > 0 ? effectiveRate : 40.0;
    }

    const amountUSD = Number(dto.amountUSD);
    const amountBS = dto.amountBS !== undefined ? Number(dto.amountBS) : Number((amountUSD * rate).toFixed(2));
    const advanceDate = dto.date || new Date().toISOString().split('T')[0];

    return this.dataSource.transaction(async manager => {
      // 1. Guardar vale
      const advance = manager.create(SalaryAdvance, {
        userId: user.id,
        negocioId: tenantId,
        amountUSD,
        amountBS,
        exchangeRate: rate,
        reason: dto.reason || 'Vale / Anticipo de nómina',
        date: advanceDate,
        status: SalaryAdvanceStatus.PENDIENTE,
      });
      const savedAdvance = await manager.save(advance);

      // 2. Registrar egreso en caja activa (OperatingExpense)
      const expense = manager.create(OperatingExpense, {
        tenantId,
        description: `Vale Empleado: ${dto.reason || 'Anticipo'} - ${user.username} ($${amountUSD.toFixed(2)} / Bs. ${amountBS.toFixed(2)})`,
        amount: amountUSD,
        paymentMethod: 'CASH',
        category: 'VALE_EMPLEADO',
        createdAt: new Date(advanceDate),
      });
      await manager.save(expense);

      return savedAdvance;
    });
  }

  async getPending(tenantId: string) {
    const advances = await this.advanceRepo.find({
      where: { negocioId: tenantId, status: SalaryAdvanceStatus.PENDIENTE },
      relations: { user: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    const totalsByUser: Record<
      string,
      { userId: string; username: string; name: string; totalUSD: number; totalBS: number; count: number }
    > = {};

    let totalPendingUSD = 0;
    let totalPendingBS = 0;

    for (const adv of advances) {
      const uid = adv.userId;
      const uName = adv.user?.username || 'Empleado';
      const uUser = adv.user?.username || 'usuario';

      if (!totalsByUser[uid]) {
        totalsByUser[uid] = {
          userId: uid,
          username: uUser,
          name: uName,
          totalUSD: 0,
          totalBS: 0,
          count: 0,
        };
      }

      const usd = Number(adv.amountUSD || 0);
      const bs = Number(adv.amountBS || 0);

      totalsByUser[uid].totalUSD = Number((totalsByUser[uid].totalUSD + usd).toFixed(2));
      totalsByUser[uid].totalBS = Number((totalsByUser[uid].totalBS + bs).toFixed(2));
      totalsByUser[uid].count += 1;

      totalPendingUSD += usd;
      totalPendingBS += bs;
    }

    return {
      advances,
      totalsByUser,
      totalPendingUSD: Number(totalPendingUSD.toFixed(2)),
      totalPendingBS: Number(totalPendingBS.toFixed(2)),
    };
  }

  async markAsDeducted(tenantId: string, id: string): Promise<SalaryAdvance> {
    const advance = await this.advanceRepo.findOne({
      where: { id, negocioId: tenantId },
    });

    if (!advance) {
      throw new NotFoundException('Vale no encontrado');
    }

    if (advance.status === SalaryAdvanceStatus.DESCONTADO) {
      throw new BadRequestException('El vale ya fue descontado previamente');
    }

    advance.status = SalaryAdvanceStatus.DESCONTADO;
    return this.advanceRepo.save(advance);
  }
}
