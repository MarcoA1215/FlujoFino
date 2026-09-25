import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { Customer } from './customer.entity';
import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { DeliveryZone } from './delivery-zone.entity';
import { OrderStatus, PaymentStatus, DeliveryMethod } from '@nutrideli/shared-types';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  identification: string;

  @Column({ nullable: true })
  customerId: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @Column({ nullable: true })
  customerAddress: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  tableNumber: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  paymentMethod: string; // 'USD' | 'PAGO_MOVIL' | 'PUNTO' | 'PENDING'

  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    default: DeliveryMethod.IN_STORE,
  })
  deliveryMethod: DeliveryMethod;

  @Column({ nullable: true })
  deliveryZoneId: string;

  @ManyToOne(() => DeliveryZone)
  @JoinColumn({ name: 'deliveryZoneId' })
  deliveryZone: DeliveryZone;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  deliveryFee: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  discountAmount: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  totalCost: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  netProfit: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  totalAmount: number;

  @Column({ nullable: true })
  pagoMovilRef: string;

  @Column({ nullable: true })
  pagoMovilPhone: string;

  @Column({ nullable: true })
  pagoMovilCedula: string;

  @Column({ nullable: true })
  pagoMovilBank: string;

  @Column('decimal', { nullable: true , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  amountBs: number;

  @Column('decimal', { nullable: true , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  exchangeRate: number;

  @Index()
  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  abonosTotal: number;

  @Column('json', { nullable: true })
  abonosHistory: any;

  @Column({ nullable: true })
  employeeId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'employeeId' })
  employee: User;
}
