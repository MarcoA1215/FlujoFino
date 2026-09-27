import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Investment } from '../entities/investment.entity';
import { Settings } from '../entities/settings.entity';
import { InvestmentType } from '@nutrideli/shared-types';
import { CreateInvestmentDto } from './dto/create-investment.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepo: Repository<Investment>,
    @InjectRepository(Settings)
    private readonly settingsRepo: Repository<Settings>,
  ) {}

  async create(tenantId: string, dto: CreateInvestmentDto): Promise<Investment> {
    let rate = dto.exchangeRate;
    if (!rate || rate <= 0) {
      const settings = await this.settingsRepo.findOne({ where: { tenantId } });
      rate = Number(settings?.exchangeRateBs || 40.0);
    }

    const amountUSD = Number(dto.amountUSD);
    const amountBS = dto.amountBS !== undefined ? Number(dto.amountBS) : Number((amountUSD * rate).toFixed(2));
    const invDate = dto.date || new Date().toISOString().split('T')[0];

    const investment = this.investmentRepo.create({
      negocioId: tenantId,
      type: dto.type,
      amountUSD,
      amountBS,
      exchangeRate: rate,
      description: dto.description,
      date: invDate,
    });

    return this.investmentRepo.save(investment);
  }

  async getSummary(tenantId: string) {
    const investments = await this.investmentRepo.find({
      where: { negocioId: tenantId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });

    let totalExternalUSD = 0;
    let totalExternalBS = 0;
    let totalReinvestmentUSD = 0;
    let totalReinvestmentBS = 0;

    for (const inv of investments) {
      const usd = Number(inv.amountUSD || 0);
      const bs = Number(inv.amountBS || 0);

      if (inv.type === InvestmentType.INVERSION_EXTERNA) {
        totalExternalUSD += usd;
        totalExternalBS += bs;
      } else if (inv.type === InvestmentType.REINVERSION_GANANCIA) {
        totalReinvestmentUSD += usd;
        totalReinvestmentBS += bs;
      }
    }

    const totalConsolidatedUSD = totalExternalUSD + totalReinvestmentUSD;
    const totalConsolidatedBS = totalExternalBS + totalReinvestmentBS;

    return {
      totalExternalUSD: Number(totalExternalUSD.toFixed(2)),
      totalExternalBS: Number(totalExternalBS.toFixed(2)),
      totalReinvestmentUSD: Number(totalReinvestmentUSD.toFixed(2)),
      totalReinvestmentBS: Number(totalReinvestmentBS.toFixed(2)),
      totalConsolidatedUSD: Number(totalConsolidatedUSD.toFixed(2)),
      totalConsolidatedBS: Number(totalConsolidatedBS.toFixed(2)),
      recentInvestments: investments.slice(0, 50),
    };
  }
}
