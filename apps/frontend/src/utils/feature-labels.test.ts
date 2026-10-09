import { describe, it, expect } from 'vitest';

export function getCatalogLabels(settings: any) {
  const hasServices = settings?.enableReservations !== undefined ? Boolean(settings?.enableReservations) : Boolean(settings?.featureCustomerSchedules);
  const hasRetail = settings?.enableRetail !== undefined ? Boolean(settings?.enableRetail) : (settings?.featureBuySell !== false);
  const hasRecipes = settings?.enableFormulas !== undefined ? Boolean(settings?.enableFormulas) : Boolean(settings?.featureRecipes);
  const hasProduction = settings?.enableProduction !== undefined ? Boolean(settings?.enableProduction) : (settings?.featureProduction !== false);
  const hasProducts = hasRetail || hasRecipes || hasProduction;

  const catalogSubtitle = (hasServices && hasProducts) 
    ? 'Productos y Servicios' 
    : (hasServices && !hasProducts) 
      ? 'Servicios' 
      : 'Productos';

  const menuLabel = (hasServices && hasProducts)
    ? 'Servicios / Productos'
    : hasServices
      ? 'Servicios'
      : 'Productos';

  const newButtonLabel = (hasServices && hasProducts)
    ? '+ Nuevo Producto / Servicio'
    : hasServices
      ? '+ Nuevo Servicio'
      : '+ Nuevo Producto';

  return {
    hasServices,
    hasProducts,
    catalogSubtitle,
    menuLabel,
    newButtonLabel,
  };
}

describe('Feature Dynamic Labels for Menu and Catalog', () => {
  it('Retorna etiquetas exclusivas de Productos cuando servicios está inactivo (Caso Reportado por el Usuario)', () => {
    const userSettings = {
      featureCustomerSchedules: false,
      enableReservations: false,
      featureBuySell: true,
      enableRetail: true,
      featureProduction: false,
      enableProduction: false,
    };

    const labels = getCatalogLabels(userSettings);
    expect(labels.hasServices).toBe(false);
    expect(labels.hasProducts).toBe(true);
    expect(labels.menuLabel).toBe('Productos');
    expect(labels.catalogSubtitle).toBe('Productos');
    expect(labels.newButtonLabel).toBe('+ Nuevo Producto');
  });

  it('Retorna etiquetas combinadas cuando tanto Productos como Servicios están activos', () => {
    const combinedSettings = {
      featureCustomerSchedules: true,
      enableReservations: true,
      featureBuySell: true,
      enableRetail: true,
      featureProduction: false,
      enableProduction: false,
    };

    const labels = getCatalogLabels(combinedSettings);
    expect(labels.hasServices).toBe(true);
    expect(labels.hasProducts).toBe(true);
    expect(labels.menuLabel).toBe('Servicios / Productos');
    expect(labels.catalogSubtitle).toBe('Productos y Servicios');
    expect(labels.newButtonLabel).toBe('+ Nuevo Producto / Servicio');
  });

  it('Retorna etiquetas exclusivas de Servicios cuando el negocio es 100% de servicios (ej. Spa o Barbería)', () => {
    const serviceOnlySettings = {
      featureCustomerSchedules: true,
      enableReservations: true,
      featureBuySell: false,
      enableRetail: false,
      featureRecipes: false,
      enableFormulas: false,
      featureProduction: false,
      enableProduction: false,
    };

    const labels = getCatalogLabels(serviceOnlySettings);
    expect(labels.hasServices).toBe(true);
    expect(labels.hasProducts).toBe(false);
    expect(labels.menuLabel).toBe('Servicios');
    expect(labels.catalogSubtitle).toBe('Servicios');
    expect(labels.newButtonLabel).toBe('+ Nuevo Servicio');
  });
});
