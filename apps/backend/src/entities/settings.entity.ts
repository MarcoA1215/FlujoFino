import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class Settings {
  @PrimaryColumn()
  id: string;

  @Column('float', { default: 40.0 })
  exchangeRateBs: number;

  @Column({ nullable: true })
  companyBank: string;

  @Column({ nullable: true })
  companyCedula: string;

  @Column({ nullable: true })
  companyPhone: string;

  @Column('boolean', { default: false })
  allowPartialPayments: boolean;
}
