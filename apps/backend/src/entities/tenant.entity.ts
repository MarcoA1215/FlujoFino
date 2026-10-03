import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { TenantPlanType, TenantStatus } from '@nutrideli/shared-types';
import { Promoter } from './promoter.entity';

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    default: TenantStatus.TRIAL,
  })
  status: TenantStatus;

  @Column({
    type: 'varchar',
    default: TenantPlanType.REGULAR,
  })
  plan_type: TenantPlanType;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  current_period_ends_at: Date;

  @Column({ type: 'uuid', nullable: true })
  referred_by_tenant_id: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  referral_code: string;

  @Column('decimal', { precision: 10, scale: 2, default: 20.00, transformer: new ColumnNumericTransformer() })
  base_price: number;

  @Column({ type: 'uuid', nullable: true })
  promoterId: string | null;

  @ManyToOne(() => Promoter, (promoter) => promoter.tenants, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'promoterId' })
  promoter: Promoter | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

