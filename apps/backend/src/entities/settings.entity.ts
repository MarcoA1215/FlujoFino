import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryColumn()
  id: string;

  @Column('decimal', { default: 40.0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  exchangeRateBs: number;

  @Column({
    type: 'varchar',
    default: 'BCV',
  })
  exchangeRateMode: 'BCV' | 'PARALELO' | 'USDT' | 'EUR' | 'MANUAL';

  @Column('decimal', { precision: 12, scale: 4, nullable: true, transformer: new ColumnNumericTransformer() })
  manualExchangeRate: number | null;

  @Column({ type: 'varchar', default: 'Bs.' })
  currencySymbol: string; // 'Bs.' | '€'

  @Column('boolean', { default: false })
  enableCopCurrency: boolean;

  @Column('decimal', { default: 4000.0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  exchangeRateCop: number;

  @Column({
    type: 'varchar',
    default: 'MANUAL',
  })
  exchangeRateCopMode: 'AUTO' | 'MANUAL';

  @Column('decimal', { precision: 12, scale: 4, nullable: true, transformer: new ColumnNumericTransformer() })
  manualExchangeRateCop: number | null;

  @Column('jsonb', { nullable: true })
  ratesCache: {
    bcv?: number;
    parallel?: number;
    usdt?: number;
    eur?: number;
    cop?: number;
    updatedAt?: string;
  } | null;

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

  // --- Datos bancarios / Nequi en Pesos Colombianos (COP) ---
  @Column({ nullable: true })
  companyCopBank: string;

  @Column({ nullable: true })
  companyCopAccountNumber: string;

  @Column({ nullable: true })
  companyCopAccountHolder: string;

  @Column({ nullable: true })
  companyCopAccountType: string; // 'AHORROS' | 'CORRIENTE' | 'NEQUI' | 'DAVIPLATA'

  @Column({ nullable: true })
  companyCopCedula: string; // C.C., C.E. o NIT

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
  acceptCashBs: boolean;

  @Column('boolean', { default: true })
  acceptPagoMovil: boolean;

  @Column('boolean', { default: false })
  acceptCardPos: boolean;

  @Column('boolean', { default: false })
  acceptBinance: boolean;

  @Column('boolean', { default: false })
  acceptTransfer: boolean;

  @Column('boolean', { default: true })
  acceptCashCop: boolean;

  @Column('boolean', { default: false })
  acceptTransferCop: boolean;

  // --- Políticas de abonos y crédito ---
  @Column('boolean', { default: true })
  allowPartialPayments: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  minDepositPercentage: number;

  @Column('boolean', { default: true })
  allowCashierBypassDeposit: boolean;

  @Column('int', { default: 7 })
  abonoDefaultDueDays: number;

  // Feature Flags / Onboarding
  @Column('boolean', { default: true })
  featureDelivery: boolean;

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

  @Column('boolean', { default: false })
  allowNegativeStock: boolean;

  @Column('boolean', { default: true })
  featureShowCatalog: boolean;

  // --- Soporte Fiscal / SENIAT / Facturación ---
  @Column('boolean', { default: false })
  featureFiscalSupport: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 16.0, transformer: new ColumnNumericTransformer() })
  fiscalDefaultTaxRate: number;

  @Column({ nullable: true })
  fiscalRif: string;

  @Column({ nullable: true })
  fiscalCompanyName: string;

  @Column({ nullable: true })
  fiscalAddress: string;

  @Column({ nullable: true })
  fiscalPhone: string;

  @Column({ type: 'varchar', default: 'INTERNAL' })
  fiscalMode: 'INTERNAL' | 'UNIDIGITAL';

  @Column('boolean', { default: true })
  bookingRequireService: boolean;

  @Column('boolean', { default: true })
  bookingAllowStaffSelection: boolean;

  @Column('boolean', { default: false })
  allowSimultaneousServices: boolean;

  // --- Booking Configuration ---
  @Column('jsonb', { nullable: true })
  businessHours: any;

  @Column('jsonb', { nullable: true })
  services: any;

  @Column('int', { default: 30 })
  slotInterval: number; // e.g. 15, 30, 60 minutes

  @Column('int', { default: 365, nullable: true })
  bookingMaxAdvanceDays: number; // Maximum days in advance customers can book (e.g. 30, 90, 365)

  @Column('int', { default: 0 })
  endOfDayOffsetHours: number; // Horas después de medianoche en que cierra el día comercial (0-6)

  @Column('boolean', { default: false })
  bookingRequireDeposit: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  bookingDepositPercentage: number;

  @Column({ nullable: true })
  themePrimaryColor: string;

  @Column({ nullable: true })
  themeHeaderColor: string;

  @Column({ nullable: true })
  companyLogoUrl: string;

  @Column({ nullable: true, default: 'ROUNDED' })
  logoShape: string; // 'ROUNDED' | 'CIRCLE' | 'NATURAL'

  @Column({ nullable: true, default: 'contain' })
  logoFit: string; // 'contain' | 'cover'

  // --- Saldo Inicial de Tesorería al iniciar en FinoWork ---
  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialCashUSD: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialBankBs: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialCashBs: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialDigitalUSD: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialCashCop: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  initialBankCop: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;
}
