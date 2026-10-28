import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsTestToTenant1792700000000 implements MigrationInterface {
  name = 'AddIsTestToTenant1792700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant" ADD COLUMN IF NOT EXISTS "is_test" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant" DROP COLUMN IF EXISTS "is_test";
    `);
  }
}
