import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { RecipeItem } from './recipe-item.entity';
import { OrderItem } from './order-item.entity';
import { ProductionBatch } from './production-batch.entity';
import { ComboItem } from './combo-item.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;
  
  @Index()
  @Column({ nullable: true })
  category: string; // new field for categorization

  @Column('float')
  salePrice: number;

  @Column('float', { default: 0 })
  stockQuantity: number;

  @Column({ default: false })
  isCombo: boolean;

  @OneToMany(() => RecipeItem, recipeItem => recipeItem.product)
  recipe: RecipeItem[];

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => ProductionBatch, batch => batch.product)
  batches: ProductionBatch[];

  @OneToMany(() => ComboItem, comboItem => comboItem.combo)
  comboItems: ComboItem[];

  @OneToMany(() => ComboItem, comboItem => comboItem.component)
  comboOf: ComboItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

