import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisterAppUpdateV1141793900000000 implements MigrationInterface {
  name = 'RegisterAppUpdateV1141793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const changes = JSON.stringify([
      {
        type: 'FIXED',
        text: 'Corrección integral en selección y precios de variantes/subproductos en Caja Registradora (POS), aplicando fielmente el precio de venta específico de cada variante.',
      },
      {
        type: 'IMPLEMENTED',
        text: 'Nuevo modal interactivo de subproductos en el POS con vista previa de fotografías, badges de disponibilidad de inventario y contador directo sin salir de la selección.',
      },
      {
        type: 'IMPLEMENTED',
        text: 'Soporte completo y sincronización de fotografías por variante en la Tienda Online pública y carrito de compras.',
      },
      {
        type: 'ADDED',
        text: 'Galería de fotografías y configuración completa de variantes en productos estrella de todos los negocios demostrativos.',
      },
      {
        type: 'FIXED',
        text: 'Preservación de variantes, costos y sobreprecios al editar comandas o reenviar pedidos a caja.',
      },
    ]);

    await queryRunner.query(`
      INSERT INTO "app_updates" (
        "id",
        "title",
        "version",
        "versionCode",
        "apkUrl",
        "mandatory",
        "graceDays",
        "fileSizeMb",
        "summary",
        "changes",
        "isPublished",
        "publishedAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid(),
        'FinoWork v1.1.4 - Selección Avanzada de Subproductos con Fotos y Mejoras en POS',
        'v1.1.4',
        15,
        'https://www.finowork.com/FinoWork.apk',
        false,
        3,
        '24.7',
        'Optimización completa en la selección y tarificación de variantes en Caja (POS) y Tienda Online, con visualización de fotografías por variante, contadores interactivos y mejoras de inventario.',
        '${changes.replace(/'/g, "''")}'::jsonb,
        true,
        NOW(),
        NOW(),
        NOW()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "app_updates"
      WHERE "versionCode" = 15 OR "version" = 'v1.1.4';
    `);
  }
}
