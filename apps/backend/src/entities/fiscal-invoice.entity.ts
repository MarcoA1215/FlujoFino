import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { Order } from './order.entity';
import { FiscalDocumentType, FiscalInvoiceStatus, FiscalProviderType, FiscalInvoiceItemDTO } from '@finowork/shared-types';

@Entity('fiscal_invoices')
@Index(['tenantId', 'invoiceNumber'])
@Index(['tenantId', 'createdAt'])
export class FiscalInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Index()
  @Column({ nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;

  @Column({
    type: 'enum',
    enum: FiscalDocumentType,
    default: FiscalDocumentType.INVOICE,
  })
  documentType: FiscalDocumentType;

  @Column({
    type: 'enum',
    enum: FiscalProviderType,
    default: FiscalProviderType.INTERNAL,
  })
  provider: FiscalProviderType;

  @Index()
  @Column({
    type: 'enum',
    enum: FiscalInvoiceStatus,
    default: FiscalInvoiceStatus.DRAFT,
  })
  status: FiscalInvoiceStatus;

  @Index()
  @Column()
  invoiceNumber: string;

  @Column({ nullable: true })
  fiscalControlNumber: string;

  @Column({ nullable: true, default: 'A' })
  series: string;

  @Column()
  customerName: string;

  @Index()
  @Column()
  customerRif: string;

  @Column({ nullable: true })
  customerAddress: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  subtotalExempt: number;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  taxableBase: number;

  @Column('decimal', { default: 16.0, precision: 5, scale: 2, transformer: new ColumnNumericTransformer() })
  taxRate: number;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  taxAmount: number;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  totalAmount: number;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  amountBs: number;

  @Column('decimal', { default: 1, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  exchangeRate: number;

  @Index()
  @Column({ nullable: true })
  externalGuid: string;

  @Column({ nullable: true })
  qrCodeUrl: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column('jsonb', { nullable: true })
  items: FiscalInvoiceItemDTO[];

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
