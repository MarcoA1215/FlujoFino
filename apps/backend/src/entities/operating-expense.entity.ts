import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('operating_expenses')
export class OperatingExpense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  amount: number;

  @Column({ nullable: true })
  paymentMethod: string;

  @Column({ type: 'varchar', default: 'GENERAL' })
  category: string; // e.g. 'PAYROLL', 'UTILITIES'

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;
}

