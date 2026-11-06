import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegisterAppUpdateV1111793500000000 implements MigrationInterface {
  name = 'RegisterAppUpdateV1111793500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const changes = JSON.stringify([
      {
        type: 'ADDED',
        text: 'Navegación fluida por pestañas con selector horizontal y gesto táctil (swipe) en guías prácticas de módulos.',
      },
      {
        type: 'IMPLEMENTED',
        text: 'Botones de avance rápido (Anterior / Siguiente) para recorrer guías paso a paso sin perder la posición.',
      },
      {
        type: 'FIXED',
        text: 'Optimización de títulos y etiquetas visuales para una interfaz más limpia, clara y profesional.',
      },
      {
        type: 'FIXED',
        text: 'Ajuste de scroll completo en modales de ayuda para pantallas móviles y de escritorio.',
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
        'Optimización Visual, Pestañas de Guías y Notificaciones Push',
        'v1.1.1',
        12,
        'https://www.finowork.com/FinoWork.apk',
        false,
        3,
        '24.7',
        'Actualización general con diseño visual pulido, pestañas interactivas con swipe en guías de módulos y compatibilidad completa con notificaciones push nativas FCM.',
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
      DELETE FROM "app_updates" WHERE "versionCode" = 12;
    `);
  }
}
