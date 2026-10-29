import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSimultaneousServicesColumns1792900000000 implements MigrationInterface {
  name = 'AddSimultaneousServicesColumns1792900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "allowSimultaneousServices" boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE "reservation" ADD COLUMN IF NOT EXISTS "isSimultaneous" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "settings" DROP COLUMN IF EXISTS "allowSimultaneousServices";
    `);
    await queryRunner.query(`
      ALTER TABLE "reservation" DROP COLUMN IF EXISTS "isSimultaneous";
    `);
  }
}
