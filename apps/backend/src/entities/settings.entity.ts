import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryColumn()
  id: string; // We'll just use 'GLOBAL'

  @Column('float', { default: 40.0 }) // Default rate just in case
  exchangeRateBs: number;
}

