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

  @Column('float')
  quantity: number;

  @ManyToOne(() => Product, product => product.comboItems, { onDelete: 'CASCADE' })
  combo: Product;

  @ManyToOne(() => Product, product => product.comboOf, { onDelete: 'RESTRICT' })
  component: Product;
}

