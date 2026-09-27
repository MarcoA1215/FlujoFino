import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Tenant } from './tenant.entity';
import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { RecipeItem } from './recipe-item.entity';

@Entity()
@Index(['tenantId', 'name'])
export class RawMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column()
  unit: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  costPerUnit: number;

  @Column('decimal', { default: 0 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  stockQuantity: number;

  @Column('decimal', { default: 5 , precision: 12, scale: 4, transformer: new ColumnNumericTransformer()})
  minStockAlert: number;

  @Column({ default: false })
  allowAsExtra: boolean;

  @Column({ type: 'varchar', default: 'COST', nullable: true })
  extraPriceType: 'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE';

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  extraPriceValue: number;

  @OneToMany(() => StockMovement, movement => movement.rawMaterial)
  movements: StockMovement[];

  @OneToMany(() => RecipeItem, recipeItem => recipeItem.rawMaterial)
  recipeItems: RecipeItem[];

  @CreateDateColumn()
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Index()
  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;
}