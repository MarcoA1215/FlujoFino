import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToPromoterCommissions1792800000000 implements MigrationInterface {
  name = 'AddNotesToPromoterCommissions1792800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promoter_commissions" ADD COLUMN IF NOT EXISTS "notes" character varying(255);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "promoter_commissions" DROP COLUMN IF EXISTS "notes";
    `);
  }
}
