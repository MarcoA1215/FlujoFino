import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>
  ) {}

  normalizePhone(phone?: string): string {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '').trim();
  }

  normalizeId(id?: string): string {
    if (!id) return '';
    return id.trim().toUpperCase();
  }

  async findOrCreateOrUpdate(
    tenantId: string, 
    data: { name: string; phone: string; identification?: string; notes?: string }
  ): Promise<Customer> {
    const cleanPhone = this.normalizePhone(data.phone);
    const cleanId = this.normalizeId(data.identification);

    let customer: Customer | null = null;

    if (cleanId) {
      customer = await this.customerRepo.findOne({
        where: { tenantId, identification: cleanId }
      });
    }

    if (!customer && cleanPhone) {
      customer = await this.customerRepo.findOne({
        where: { tenantId, phone: cleanPhone }
      });
      // Fallback: also try last 7 digits if formatted differently
      if (!customer && cleanPhone.length >= 7) {
        const last7 = cleanPhone.slice(-7);
        customer = await this.customerRepo.createQueryBuilder('c')
          .where('c.tenantId = :tenantId', { tenantId })
          .andWhere('c.phone LIKE :last7', { last7: `%${last7}` })
          .getOne();
      }
    }

    if (customer) {
      // Update details if newer or more complete
      if (data.name && data.name.trim().length > customer.name.length) {
        customer.name = data.name.trim();
      }
      if (cleanId && !customer.identification) {
        customer.identification = cleanId;
      }
      if (data.notes && !customer.notes) {
        customer.notes = data.notes;
      }
      customer.totalVisits = (customer.totalVisits || 0) + 1;
      return this.customerRepo.save(customer);
    } else {
      customer = this.customerRepo.create({
        tenantId,
        name: (data.name || 'Cliente').trim(),
        phone: cleanPhone || data.phone,
        identification: cleanId || undefined,
        notes: data.notes || undefined,
        totalVisits: 1,
      });
      return this.customerRepo.save(customer);
    }
  }

  async lookup(tenantId: string, query: string) {
    if (!query || !query.trim()) {
      return { exists: false };
    }
    const q = query.trim();
    const cleanPhone = this.normalizePhone(q);
    const cleanId = this.normalizeId(q);

    let customer: Customer | null = null;

    // Search by identification
    if (cleanId) {
      customer = await this.customerRepo.findOne({
        where: { tenantId, identification: cleanId }
      });
    }

    // Search by phone
    if (!customer && cleanPhone) {
      customer = await this.customerRepo.findOne({
        where: { tenantId, phone: cleanPhone }
      });
      if (!customer && cleanPhone.length >= 7) {
        const last7 = cleanPhone.slice(-7);
        customer = await this.customerRepo.createQueryBuilder('c')
          .where('c.tenantId = :tenantId', { tenantId })
          .andWhere('c.phone LIKE :last7', { last7: `%${last7}` })
          .getOne();
      }
    }

    if (customer) {
      return {
        exists: true,
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        identification: customer.identification || '',
        notes: customer.notes || '',
        totalVisits: customer.totalVisits || 0,
      };
    }

    return { exists: false };
  }

  async findAll(tenantId: string, search?: string) {
    const qb = this.customerRepo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId });

    if (search && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(c.name) LIKE :s OR c.phone LIKE :s OR LOWER(c.identification) LIKE :s)', { s });
    }

    qb.orderBy('c.updatedAt', 'DESC');
    return qb.getMany();
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.customerRepo.findOne({ where: { tenantId, id } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async create(tenantId: string, dto: any) {
    const cleanPhone = this.normalizePhone(dto.phone);
    const cleanId = this.normalizeId(dto.identification);

    const customer = this.customerRepo.create({
      tenantId,
      name: dto.name?.trim(),
      phone: cleanPhone || dto.phone,
      identification: cleanId || undefined,
      notes: dto.notes?.trim() || undefined,
      totalVisits: Number(dto.totalVisits) || 0,
    });
    return this.customerRepo.save(customer);
  }

  async update(tenantId: string, id: string, dto: any) {
    const customer = await this.findOne(tenantId, id);
    if (dto.name !== undefined) customer.name = dto.name.trim();
    if (dto.phone !== undefined) customer.phone = this.normalizePhone(dto.phone) || dto.phone;
    if (dto.identification !== undefined) customer.identification = this.normalizeId(dto.identification) || null;
    if (dto.notes !== undefined) customer.notes = dto.notes;
    if (dto.totalVisits !== undefined) customer.totalVisits = Number(dto.totalVisits);

    return this.customerRepo.save(customer);
  }

  async delete(tenantId: string, id: string) {
    const customer = await this.findOne(tenantId, id);
    await this.customerRepo.remove(customer);
    return { success: true };
  }
}
