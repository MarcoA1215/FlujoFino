import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkDemoTenantsAsTest1793300000000 implements MigrationInterface {
  name = 'MarkDemoTenantsAsTest1793300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tenant"
      SET "is_test" = true,
          "promoterId" = NULL
      WHERE "referral_code" IN ('demo-retail', 'demo-panaderia', 'demo-servicios', 'demo-autolavado', 'demo-gastronomia', 'demo-estetica', 'FINO-CENTRAL')
         OR "name" IN ('Boutique Moda Urbana', 'Panadería La Espiga', 'Barbería & Spa Élite', 'Auto Lavado Express', 'Burger House Gourmet', 'Centro Estético Glow', 'FinoWork Central')
         OR LOWER("name") LIKE '%demo%'
         OR LOWER("name") LIKE '%prueba%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op rollback
  }
}
