import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, Index, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
@Index(['tenantId', 'productId'])
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  productId: string;

  @ManyToOne(() => Product, product => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Index()
  @Column({ nullable: true })
  tenantId: string;

  @Column()
  name: string;

  @Index()
  @Column({ nullable: true })
  sku: string;

  @Column('jsonb', { nullable: true })
  attributes: Record<string, any>;

  @Column('decimal', { default: 0, precision: 12, scale: 4, transformer: new ColumnNumericTransformer() })
  stockQuantity: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  cost: number | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true, transformer: new ColumnNumericTransformer() })
  salePrice: number | null;

  @Column('boolean', { default: false })
  isTaxExempt: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 16.0, transformer: new ColumnNumericTransformer() })
  taxRate: number;

  @Column('simple-array', { nullable: true })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
