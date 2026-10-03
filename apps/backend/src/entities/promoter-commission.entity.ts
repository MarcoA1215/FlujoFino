import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Promoter } from './promoter.entity';
import { Tenant } from './tenant.entity';
import { SaaSPaymentReport } from './saas-payment-report.entity';
import { PromoterCommissionType, PromoterCommissionStatus } from '@nutrideli/shared-types';

@Entity('promoter_commissions')
export class PromoterCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  promoterId: string;

  @ManyToOne(() => Promoter, (promoter) => promoter.commissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoterId' })
  promoter: Promoter;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'varchar',
    length: 30,
    default: PromoterCommissionType.ACTIVATION,
  })
  type: PromoterCommissionType;

  @Column('decimal', {
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amountUSD: number;

  @Column({ type: 'uuid', nullable: true })
  saasPaymentReportId: string | null;

  @ManyToOne(() => SaaSPaymentReport, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'saasPaymentReportId' })
  saasPaymentReport: SaaSPaymentReport | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: PromoterCommissionStatus.PENDING,
  })
  status: PromoterCommissionStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

