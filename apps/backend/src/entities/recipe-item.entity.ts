import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
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

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  quantity: number;

  @ManyToOne(() => Product, product => product.recipe, { onDelete: 'CASCADE' })
  product: Product;

  @ManyToOne(() => RawMaterial, material => material.recipeItems)
  rawMaterial: RawMaterial;
}

