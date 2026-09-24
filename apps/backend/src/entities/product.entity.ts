import { Tenant } from './tenant.entity';
import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column('float')
  salePrice: number;

  @Column('int', { name: 'duration_minutes', nullable: true, default: 30 })
  durationMinutes: number | null;

  @Column('float', { default: 0 })
  stockQuantity: number;

  @Column('float', { default: 0 })
  physicalStock: number;

  @Column({ default: false })
  isCombo: boolean;

  @Column({ default: false })
  isPreAssembled: boolean;

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

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

}