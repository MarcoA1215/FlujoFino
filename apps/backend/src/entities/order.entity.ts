import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '@nutrideli/shared-types';

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

  @Column('float', { default: 0 })
  totalAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];
}

