import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDemoProductVariantImages1793800000000 implements MigrationInterface {
  name = 'AddDemoProductVariantImages1793800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Asegurar hasVariants = true en productos demo correspondientes
    await queryRunner.query(`
      UPDATE "product"
      SET "hasVariants" = true
      WHERE "name" IN (
        'Camisa Oversize Algodón',
        'Franela Básica Cuello Redondo',
        'Papas Fritas Rústicas con Cheddar',
        'Croissant Francés de Mantequilla',
        'Pomada Fijadora Mate Arcilla 100g',
        'Sérum Facial Vitamina C 30ml'
      );
    `);

    // 2. Asignar imágenes a las variantes de productos demo (por SKU o Nombre)
    const variantImageMappings = [
      {
        skus: ['CAM-WHT-S'],
        names: ['Blanco / Talla S', 'Blanco S'],
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['CAM-WHT-M'],
        names: ['Blanco / Talla M', 'Blanco M'],
        image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['CAM-BLK-M'],
        names: ['Negro / Talla M', 'Negro M'],
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['CAM-BLK-L'],
        names: ['Negro / Talla L', 'Negro L'],
        image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['FRA-WHT-M'],
        names: ['Blanco Puro / Talla M', 'Blanco M', 'Franela Blanco M'],
        image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['FRA-BLK-L'],
        names: ['Negro Profundo / Talla L', 'Negro L', 'Franela Negro L'],
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['FRA-GRY-M'],
        names: ['Gris Jaspe / Talla M', 'Gris M', 'Franela Gris M'],
        image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['PAP-MED-SAL'],
        names: ['Porción Mediana (Sal Marina)', 'Porción Mediana', 'Mediana'],
        image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['PAP-ESP-BAC'],
        names: ['Porción Especial (Cheddar & Bacon)', 'Porción Especial', 'Especial Cheddar & Bacon'],
        image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['CRO-CLS-01'],
        names: ['Clásico Mantequilla Dorada', 'Mantequilla Artesanal', 'Clásico'],
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['CRO-NUT-02'],
        names: ['Relleno de Nutella & Avellanas', 'Nutella & Avellanas', 'Nutella'],
        image: 'https://images.unsplash.com/photo-1623334044303-241021148842?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['POM-STD-100'],
        names: ['Presentación Estándar 100g', 'Fijación Media Mate 100g', 'Estándar 100g'],
        image: 'https://images.unsplash.com/photo-1597854710119-a5a8fc52c28d?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['POM-PRO-150'],
        names: ['Presentación Pro Barber 150g', 'Fijación Fuerte Pro 150g', 'Pro 150g'],
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['SER-VITC-30'],
        names: ['Gotero Concentrado 30ml', 'Gotero 30ml', 'Gotero Estándar 30ml'],
        image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'
      },
      {
        skus: ['SER-VITC-50'],
        names: ['Dosificador Clínico 50ml', 'Dosificador 50ml Familiar', 'Dosificador 50ml'],
        image: 'https://images.unsplash.com/photo-1608248597359-561352136932?w=600&auto=format&fit=crop&q=80'
      }
    ];

    for (const mapping of variantImageMappings) {
      await queryRunner.query(
        `
        UPDATE "product_variant"
        SET "images" = $1
        WHERE ("sku" = ANY($2) OR "name" = ANY($3))
          AND ("images" IS NULL OR "images" = '' OR "images" = '{}');
        `,
        [mapping.image, mapping.skus, mapping.names]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op rollback para no sobreescribir datos personalizados
  }
}
