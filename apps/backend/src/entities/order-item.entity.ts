import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { OrderItemMedia } from './order-item-media.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  orderId: string;

  @Index()
  @Column()
  productId: string;

  @Column({ nullable: true })
  productName: string;

  @Index()
  @Column({ nullable: true })
  variantId?: string;

  @Column({ nullable: true })
  variantName?: string;

  @Column({ nullable: true })
  employeeId?: string;

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

  @Column('boolean', { default: false })
  isTaxExempt: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 16.0, transformer: new ColumnNumericTransformer() })
  taxRate: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  taxAmount: number;

  @Column('simple-json', { nullable: true })
  removedIngredients?: string[];

  @Column('simple-json', { nullable: true })
  addedExtras?: Array<{ rawMaterialId: string; name: string; priceUSD: number; quantity: number }>;

  @Column({ default: false })
  hasModifications: boolean;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems)
  product: Product;

  @OneToMany(() => OrderItemMedia, media => media.orderItem)
  media: OrderItemMedia[];
}
