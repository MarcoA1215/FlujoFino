import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { RecipeItem } from './recipe-item.entity';
import { OrderItem } from './order-item.entity';
import { ProductionBatch } from './production-batch.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;
  
  @Column({ nullable: true })
  category: string; // new field for categorization

  @Column('float')
  salePrice: number;

  @Column('float', { default: 0 })
  stockQuantity: number;

  @OneToMany(() => RecipeItem, recipeItem => recipeItem.product)
  recipe: RecipeItem[];

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => ProductionBatch, batch => batch.product)
  batches: ProductionBatch[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

