import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
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

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  unitPrice: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  unitCost: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  subtotal: number;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems)
  product: Product;

  @OneToMany(() => OrderItemMedia, media => media.orderItem)
  media: OrderItemMedia[];
}

