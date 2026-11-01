// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { getPresetFlagsForProfile } from './Register';
import { getCatalogLabels } from '../utils/feature-labels.test';

describe('Registro de Negocios - Presets Inteligentes de Módulos (getPresetFlagsForProfile)', () => {
  it('configura el perfil SERVICES (Spas, Salones, Barberías) sin lotes de producción ni recetas', () => {
    const flags = getPresetFlagsForProfile('SERVICES');
    expect(flags).toEqual({
      featureCustomerSchedules: true,
      featureBuySell: false,
      featureRecipes: false,
      featureProduction: false,
      featureDelivery: false,
      featureShowCatalog: true,
    });

    const labels = getCatalogLabels(flags);
    expect(labels.hasServices).toBe(true);
    expect(labels.hasProducts).toBe(false);
    expect(labels.menuLabel).toBe('Servicios');
  });

  it('configura el perfil RETAIL (Tiendas de Ropa, Calzado, Accesorios) con compra-venta y delivery sin producción', () => {
    const flags = getPresetFlagsForProfile('RETAIL');
    expect(flags).toEqual({
      featureCustomerSchedules: false,
      featureBuySell: true,
      featureRecipes: false,
      featureProduction: false,
      featureDelivery: true,
      featureShowCatalog: true,
    });

    const labels = getCatalogLabels(flags);
    expect(labels.hasServices).toBe(false);
    expect(labels.hasProducts).toBe(true);
    expect(labels.menuLabel).toBe('Productos');
  });

  it('configura el perfil FOOD_PRODUCTION (Restaurantes, Panaderías, Repostería) con recetas, producción y delivery', () => {
    const flags = getPresetFlagsForProfile('FOOD_PRODUCTION');
    expect(flags).toEqual({
      featureCustomerSchedules: false,
      featureBuySell: false,
      featureRecipes: true,
      featureProduction: true,
      featureDelivery: true,
      featureShowCatalog: true,
    });

    const labels = getCatalogLabels(flags);
    expect(labels.hasServices).toBe(false);
    expect(labels.hasProducts).toBe(true);
    expect(labels.menuLabel).toBe('Productos');
  });
});
