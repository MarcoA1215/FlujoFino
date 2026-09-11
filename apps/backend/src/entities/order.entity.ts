import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentStatus } from '@nutrideli/shared-types';

@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  customerAddress: string;

  @Column({ nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column('float', { default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  pagoMovilRef: string;

  @Column({ nullable: true })
  pagoMovilPhone: string;

  @Column({ nullable: true })
  pagoMovilCedula: string;

  @Column({ nullable: true })
  pagoMovilBank: string;

  @Column('float', { nullable: true })
  amountBs: number;

  @Column('float', { nullable: true })
  exchangeRate: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];
}

