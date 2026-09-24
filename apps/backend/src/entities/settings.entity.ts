import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryColumn()
  id: string;

  @Column('decimal', { default: 40.0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  exchangeRateBs: number;

  @Column({ nullable: true })
  companyBank: string;

  @Column({ nullable: true })
  companyCedula: string;

  @Column({ nullable: true })
  companyPhone: string;

  @Column('boolean', { default: false })
  allowPartialPayments: boolean;

  // Feature Flags / Onboarding
  @Column('boolean', { default: false })
  featureCustomerSchedules: boolean;

  @Column('boolean', { default: false })
  featureRecipes: boolean;

  @Column('boolean', { default: false })
  featureBuySell: boolean;

  @Column('boolean', { default: true })
  featureProduction: boolean;

  @Column('boolean', { default: false })
  requireApprovalAlways: boolean;

  @Column('boolean', { default: true })
  featureShowCatalog: boolean;

  @Column('boolean', { default: false })
  bookingRequireService: boolean;

  @Column('boolean', { default: false })
  bookingAllowStaffSelection: boolean;

  // --- Booking Configuration ---
  @Column('jsonb', { nullable: true })
  businessHours: any;

  @Column('jsonb', { nullable: true })
  services: any;

  @Column('int', { default: 30 })
  slotInterval: number; // e.g. 15, 30, 60 minutes

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;
}
