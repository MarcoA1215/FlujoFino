import { Tenant } from './tenant.entity';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryColumn()
  id: string;

  @Column('float', { default: 40.0 })
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
