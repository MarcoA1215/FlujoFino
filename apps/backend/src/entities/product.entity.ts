import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
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

  @Column('float')
  salePrice: number;

  @Column('int', { default: 0 })
  stockQuantity: number;

  @OneToMany(() => RecipeItem, recipeItem => recipeItem.product)
  recipe: RecipeItem[];

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => ProductionBatch, batch => batch.product)
  batches: ProductionBatch[];
}

