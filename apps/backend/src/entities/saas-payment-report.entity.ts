import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { SaaSPaymentMethod, SaaSPaymentStatus } from '@nutrideli/shared-types';

@Entity('saas_payment_reports')
export class SaaSPaymentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('decimal', { precision: 10, scale: 2, transformer: new ColumnNumericTransformer() })
  amount: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  amount_bs: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  exchange_rate: number | null;

  @Column({
    type: 'varchar',
    default: SaaSPaymentMethod.PAGO_MOVIL,
  })
  payment_method: SaaSPaymentMethod;

  @Column()
  reference: string;

  @Column({
    type: 'varchar',
    default: SaaSPaymentStatus.PENDING,
  })
  status: SaaSPaymentStatus;

  @Column({ type: 'text', nullable: true })
  reject_reason: string | null;

  @CreateDateColumn()
  created_at: Date;
}
