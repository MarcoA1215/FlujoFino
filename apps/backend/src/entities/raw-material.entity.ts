import { Tenant } from './tenant.entity';
import { Entity, Index, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { RecipeItem } from './recipe-item.entity';

@Entity()
export class RawMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column()
  unit: string;

  @Column('float')
  costPerUnit: number;

  @Column('float', { default: 0 })
  stockQuantity: number;

  @Column('float', { default: 5 })
  minStockAlert: number;

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

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;

}