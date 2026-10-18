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

  normalizeId(id?: string | null): string {
    if (!id) return '';
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return '';
    const prefixMatch = trimmed.match(/^([VEJGP])/);
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';
    const prefix = prefixMatch ? prefixMatch[1] : 'V';
    return `${prefix}-${digits}`;
  }

  private async findCustomerByNormalizedId(tenantId: string, rawId?: string): Promise<Customer | null> {
    const cleanId = this.normalizeId(rawId);
    if (!cleanId) return null;

    // 1. Búsqueda exacta por formato canónico (ej. V-31075846)
    const exact = await this.customerRepo.findOne({
      where: { tenantId, identification: cleanId },
    });
    if (exact) return exact;

    // 2. Fallback para registros antiguos con puntos, sin guion o sin prefijo (ej. 31075846, v31.075.846)
    const digits = cleanId.replace(/\D/g, '');
    if (digits.length >= 5) {
      const qb = this.customerRepo.createQueryBuilder?.('c');
      if (qb) {
        const candidate = await qb
          .where('c.tenantId = :tenantId', { tenantId })
          .andWhere("REGEXP_REPLACE(COALESCE(c.identification, ''), '[^0-9]', '', 'g') = :digits", { digits })
          .getOne();
        if (candidate) {
          return candidate;
        }
      }
    }
    return null;
  }

  async findOrCreateOrUpdate(
    tenantId: string, 
    data: { name: string; phone: string; identification?: string; notes?: string }
  ): Promise<Customer> {
    const cleanPhone = this.normalizePhone(data.phone);
    const cleanId = this.normalizeId(data.identification);

    let customer: Customer | null = null;

    if (cleanId) {
      customer = await this.findCustomerByNormalizedId(tenantId, cleanId);
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
      if (cleanId && customer.identification !== cleanId) {
        customer.identification = cleanId;
      }
      if (data.notes && !customer.notes) {
        customer.notes = data.notes;
      }
      return this.customerRepo.save(customer);
    } else {
      customer = this.customerRepo.create({
        tenantId,
        name: (data.name || 'Cliente').trim(),
        phone: cleanPhone || data.phone,
        identification: cleanId || undefined,
        notes: data.notes || undefined,
        totalVisits: 0,
      });
      return this.customerRepo.save(customer);
    }
  }

  async incrementVisits(tenantId: string, customerId: string): Promise<void> {
    if (!customerId) return;
    const customer = await this.customerRepo.findOne({ where: { tenantId, id: customerId } });
    if (customer) {
      customer.totalVisits = (customer.totalVisits || 0) + 1;
      await this.customerRepo.save(customer);
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

    // Search by identification (canonical + digit-normalized fallback)
    if (cleanId) {
      customer = await this.findCustomerByNormalizedId(tenantId, cleanId);
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
        identification: this.normalizeId(customer.identification) || customer.identification || '',
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
      const rawSearch = search.trim();
      const s = `%${rawSearch.toLowerCase()}%`;
      const digitsOnly = rawSearch.replace(/\D/g, '');
      if (digitsOnly.length >= 4) {
        const d = `%${digitsOnly}%`;
        qb.andWhere(
          "(LOWER(c.name) LIKE :s OR c.phone LIKE :s OR LOWER(c.identification) LIKE :s OR REGEXP_REPLACE(COALESCE(c.identification, ''), '[^0-9]', '', 'g') LIKE :d)",
          { s, d },
        );
      } else {
        qb.andWhere('(LOWER(c.name) LIKE :s OR c.phone LIKE :s OR LOWER(c.identification) LIKE :s)', { s });
      }
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
