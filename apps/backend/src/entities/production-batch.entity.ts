import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('int')
  quantity: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  totalCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Product, product => product.batches)
  product: Product;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

}