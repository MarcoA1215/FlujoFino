import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column('int')
  quantity: number;

  @Column('float', { default: 0 })
  totalCost: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Product, product => product.batches)
  product: Product;
}

