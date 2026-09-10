import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { StockMovement } from './stock-movement.entity';
import { RecipeItem } from './recipe-item.entity';

@Entity()
export class RawMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
}

