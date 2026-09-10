import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';
import { RawMaterial } from './raw-material.entity';

@Entity()
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  rawMaterialId: string;

  @Column('float')
  quantity: number;

  @ManyToOne(() => Product, product => product.recipe, { onDelete: 'CASCADE' })
  product: Product;

  @ManyToOne(() => RawMaterial, material => material.recipeItems)
  rawMaterial: RawMaterial;
}

