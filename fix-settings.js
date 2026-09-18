const fs = require('fs');
let settingsContent = `import { Tenant } from './tenant.entity';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

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

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true })
  tenantId: string;
}
`;
fs.writeFileSync('apps/backend/src/entities/settings.entity.ts', settingsContent);
console.log("Fixed settings");
