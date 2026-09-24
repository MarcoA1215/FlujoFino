import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ComboItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  comboId: string;

  @Column()
  componentId: string;

  @Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })
  quantity: number;

  @ManyToOne(() => Product, product => product.comboItems, { onDelete: 'CASCADE' })
  combo: Product;

  @ManyToOne(() => Product, product => product.comboOf, { onDelete: 'RESTRICT' })
  component: Product;
}

