import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { OrderItemMedia } from './order-item-media.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column({ nullable: true })
  productName: string;

  @Column('int')
  quantity: number;

  @Column('int', { default: 0 })
  deliveredQuantity: number;

  @Column('float')
  unitPrice: number;

  @Column('float', { default: 0 })
  unitCost: number;

  @Column('float')
  subtotal: number;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems)
  product: Product;

  @OneToMany(() => OrderItemMedia, media => media.orderItem)
  media: OrderItemMedia[];
}

