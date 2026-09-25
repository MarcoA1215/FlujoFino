import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
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

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  salePrice: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  estimatedCost: number;

  @Column('int', { name: 'duration_minutes', nullable: true, default: 30 })
  durationMinutes: number | null;

  @Column('simple-array', { nullable: true })
  assignedStaffIds: string[];

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  stockQuantity: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  cost: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  stock: number;

  @Column({ name: 'is_service', default: false })
  is_service: boolean;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
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