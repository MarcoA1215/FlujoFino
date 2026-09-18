import { Tenant } from './tenant.entity';
﻿import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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
  customerAddress: string;

  @Column({ nullable: true })
  notes: string;

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

  @Column('float', { default: 0 })
  deliveryFee: number;

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

}

  @Column('float', { default: 0 })
  abonosTotal: number;

  @Column('json', { nullable: true })
  abonosHistory: any;
}

