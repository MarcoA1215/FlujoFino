// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pos, { getProductStockBadgeLabel, calculateProfitOrLoss } from './Pos';
import { apiClient } from '../api/client';

// Mock del cliente API para evitar llamadas reales durante el test
vi.mock('../api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  }
}));

describe('Caja Registradora (POS) - Lógica de Rentabilidad y Descuentos', () => {
  it('Debe inicializar y consultar productos al montar', async () => {
    const mockProducts = [
      { id: '1', name: 'Servicio VIP', salePrice: 50.00, baseCost: 10.00, stockQuantity: 5 }
    ];
    (apiClient.get as any).mockResolvedValue({ data: mockProducts });

    render(
      <MemoryRouter>
        <Pos />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/products');
    });
  });

  describe('Matemáticas de Rentabilidad Interna (calculateProfitOrLoss)', () => {
    it('Debe advertir de pérdida cuando descuento > ganancia neta', () => {
      const salePrice = 50.00;
      const baseCost = 45.00; // Margen bajo de $5
      const discountAmount = 10.00;

      const { lossAmount, isLoss, finalTotal } = calculateProfitOrLoss(salePrice, baseCost, discountAmount);

      expect(finalTotal).toBe(40.00);
      expect(lossAmount).toBe(5.00);
      expect(isLoss).toBe(true);
    });

    it('Debe reportar ganancia positiva y no pérdida cuando el margen es saludable', () => {
      const salePrice = 50.00;
      const baseCost = 20.00;
      const discountAmount = 5.00;

      const { lossAmount, isLoss, netProfit } = calculateProfitOrLoss(salePrice, baseCost, discountAmount);

      expect(netProfit).toBe(25.00);
      expect(isLoss).toBe(false);
      expect(lossAmount).toBe(0);
    });
  });

  describe('Formateo de Stock y Modo Bajo Demanda (getProductStockBadgeLabel)', () => {
    it('debe mostrar "Por producir: 15" cuando el stock es negativo (-15)', () => {
      const label = getProductStockBadgeLabel(-15);
      expect(label).toBe('Por producir: 15');
    });

    it('debe mostrar "Agotado" cuando el stock es estrictamente 0', () => {
      const label = getProductStockBadgeLabel(0);
      expect(label).toBe('Agotado');
    });

    it('debe mostrar "Stock: 25" cuando el stock es positivo', () => {
      const label = getProductStockBadgeLabel(25);
      expect(label).toBe('Stock: 25');
    });

    it('debe respetar si es un servicio mostrando tiempo o etiqueta Servicio', () => {
      expect(getProductStockBadgeLabel(-10, true, 45)).toBe('⏱️ 45m');
      expect(getProductStockBadgeLabel(0, true)).toBe('Servicio');
    });
  });
});
