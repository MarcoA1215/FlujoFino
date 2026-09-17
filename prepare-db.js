const fs = require('fs');
const path = require('path');

const entitiesDir = path.join(__dirname, 'apps/backend/src/entities');

// 1. Create Tenant Entity
const tenantCode = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`;
fs.writeFileSync(path.join(entitiesDir, 'tenant.entity.ts'), tenantCode);

// 2. Create UserTenantAccess Entity
const userTenantCode = `import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Tenant } from './tenant.entity';
import { UserRole } from '@nutrideli/shared-types';

@Entity()
export class UserTenantAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.tenantAccess, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @Column({ type: 'varchar', default: 'USER' })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}
`;
fs.writeFileSync(path.join(entitiesDir, 'user-tenant-access.entity.ts'), userTenantCode);

// 3. Create WorkSchedule Entity
const workScheduleCode = `import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UserTenantAccess } from './user-tenant-access.entity';

@Entity()
export class WorkSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserTenantAccess, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userTenantAccessId' })
  userTenantAccess: UserTenantAccess;

  @Column()
  userTenantAccessId: string;

  // 0 = Sunday, 1 = Monday, etc.
  @Column({ type: 'int' })
  dayOfWeek: number;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;
}
`;
fs.writeFileSync(path.join(entitiesDir, 'work-schedule.entity.ts'), workScheduleCode);

// 4. Update Existing Entities to include tenantId
const entitiesToUpdate = [
  'product.entity.ts',
  'order.entity.ts',
  'raw-material.entity.ts',
  'production-batch.entity.ts',
  'stock-movement.entity.ts',
  'settings.entity.ts',
  'delivery-zone.entity.ts'
];

for (const file of entitiesToUpdate) {
  const filePath = path.join(entitiesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add imports if missing
    if (!content.includes('Tenant')) {
      content = `import { Tenant } from './tenant.entity';\n` + content;
    }
    
    // Check if ManyToOne is imported
    if (!content.includes('ManyToOne')) {
      content = content.replace(/import { Entity, PrimaryGeneratedColumn/, "import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn");
    } else if (!content.includes('JoinColumn')) {
      content = content.replace(/ManyToOne/, "ManyToOne, JoinColumn");
    }

    // Add tenantId column
    if (!content.includes('tenantId: string')) {
      const injectString = `
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ nullable: true }) // Temporarily nullable for safe migration
  tenantId: string;
`;
      // Find the last closing brace
      const lastBraceIndex = content.lastIndexOf('}');
      content = content.substring(0, lastBraceIndex) + injectString + '\n}';
      fs.writeFileSync(filePath, content);
    }
  }
}

// 5. Update User entity
const userPath = path.join(entitiesDir, 'user.entity.ts');
let userContent = fs.readFileSync(userPath, 'utf8');
if (!userContent.includes('UserTenantAccess')) {
  userContent = `import { UserTenantAccess } from './user-tenant-access.entity';\n` + userContent;
  if (!userContent.includes('OneToMany')) {
    userContent = userContent.replace(/import { Entity, PrimaryGeneratedColumn/, "import { Entity, PrimaryGeneratedColumn, OneToMany");
  }
  const injectUserString = `
  @OneToMany(() => UserTenantAccess, access => access.user)
  tenantAccess: UserTenantAccess[];
`;
  const lastBraceIndexUser = userContent.lastIndexOf('}');
  userContent = userContent.substring(0, lastBraceIndexUser) + injectUserString + '\n}';
  fs.writeFileSync(userPath, userContent);
}

console.log("DB Structure prepared for Multi-Tenancy & Scheduling!");
