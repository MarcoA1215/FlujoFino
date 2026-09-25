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

  @Column({ nullable: true })
  companyAccountNumber: string;

  @Column({ nullable: true })
  companyAccountHolder: string;

  // --- Binance Pay Config ---
  @Column({ nullable: true })
  binancePayId: string;

  @Column({ nullable: true })
  binanceEmail: string;

  @Column({ nullable: true })
  binancePhone: string;

  // --- Métodos de pago aceptados ---
  @Column('boolean', { default: true })
  acceptCashUsd: boolean;

  @Column('boolean', { default: true })
  acceptPagoMovil: boolean;

  @Column('boolean', { default: false })
  acceptCardPos: boolean;

  @Column('boolean', { default: false })
  acceptBinance: boolean;

  @Column('boolean', { default: false })
  acceptTransfer: boolean;

  // --- Políticas de abonos y crédito ---
  @Column('boolean', { default: true })
  allowPartialPayments: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  minDepositPercentage: number;

  @Column('boolean', { default: true })
  allowCashierBypassDeposit: boolean;

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

  @Column({ nullable: true })
  themePrimaryColor: string;

  @Column({ nullable: true })
  themeHeaderColor: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;
}
