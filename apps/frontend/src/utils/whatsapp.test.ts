import { describe, it, expect } from 'vitest';
import { formatWhatsAppUrl, buildWhatsAppOrderMessage } from './whatsapp';

describe('WhatsApp Utilities (formatWhatsAppUrl & buildWhatsAppOrderMessage)', () => {
  describe('formatWhatsAppUrl', () => {
    it('debe devolver enlace raíz https://wa.me/ cuando el teléfono no es suministrado', () => {
      expect(formatWhatsAppUrl(undefined)).toBe('https://wa.me/');
      expect(formatWhatsAppUrl(null)).toBe('https://wa.me/');
      expect(formatWhatsAppUrl('')).toBe('https://wa.me/');
    });

    it('debe anteponer el código de país 58 si el teléfono comienza con 0 local', () => {
      const url = formatWhatsAppUrl('0414-1234567');
      expect(url).toBe('https://wa.me/584141234567');
    });

    it('debe sanitizar caracteres especiales como espacios, guiones, paréntesis y signos más', () => {
      const url = formatWhatsAppUrl('+58 (424) 998-1122');
      expect(url).toBe('https://wa.me/584249981122');
    });

    it('debe respetar números internacionales sin prefijo 0', () => {
      const url = formatWhatsAppUrl('+1 (555) 234-5678');
      expect(url).toBe('https://wa.me/15552345678');
    });

    it('debe codificar adecuadamente el texto en la query string (encodeURIComponent)', () => {
      const texto = 'Hola, ¿cómo estás? Pedido #45: $15.50 & delivery.';
      const url = formatWhatsAppUrl('04121112233', texto);

      expect(url).toContain('https://wa.me/584121112233?text=');
      expect(url).toContain(encodeURIComponent(texto));
      expect(url).not.toContain(' '); // Sin espacios sin codificar
    });
  });

  describe('buildWhatsAppOrderMessage', () => {
    it('debe construir un mensaje con desglose de ítems, montos en USD y Bs, y notas', () => {
      const message = buildWhatsAppOrderMessage({
        orderNumber: '0012',
        customerName: 'Carlos Pérez',
        items: [
          { name: 'Hamburguesa Doble', quantity: 2, priceUSD: 8.5 },
          { name: 'Refresco 1.5L', quantity: 1, priceUSD: 2.0 },
        ],
        deliveryFeeUSD: 3.0,
        totalUSD: 22.0,
        totalBs: 1100.0,
        paymentMethod: 'Pago Móvil (Ref. 987654)',
        notes: 'Sin cebolla por favor',
      });

      expect(message).toContain('🛒 *PEDIDO #0012*');
      expect(message).toContain('👤 *Cliente:* Carlos Pérez');
      expect(message).toContain('• 2x Hamburguesa Doble - $17.00');
      expect(message).toContain('• 1x Refresco 1.5L - $2.00');
      expect(message).toContain('🛵 *Delivery:* $3.00');
      expect(message).toContain('💵 *TOTAL:* $22.00 / Bs. 1100.00');
      expect(message).toContain('💳 *Pago:* Pago Móvil (Ref. 987654)');
      expect(message).toContain('📝 *Notas:* Sin cebolla por favor');
    });

    it('debe omitir el desglose de delivery y moneda Bs si no son especificados', () => {
      const message = buildWhatsAppOrderMessage({
        items: [{ name: 'Corte de Cabello', quantity: 1, priceUSD: 15.0 }],
        totalUSD: 15.0,
      });

      expect(message).toContain('🛒 *NUEVO PEDIDO*');
      expect(message).not.toContain('🛵 *Delivery:*');
      expect(message).not.toContain('/ Bs.');
      expect(message).toContain('💵 *TOTAL:* $15.00');
    });

    it('debe ser compatible con formatWhatsAppUrl generando una URL válida y codificada', () => {
      const summary = {
        orderNumber: '8899',
        customerName: 'Ana',
        items: [{ name: 'Pizza', quantity: 1, priceUSD: 10 }],
        totalUSD: 10,
      };
      const text = buildWhatsAppOrderMessage(summary);
      const url = formatWhatsAppUrl('04149998877', text);

      expect(url.startsWith('https://wa.me/584149998877?text=')).toBe(true);
      expect(decodeURIComponent(url)).toContain('🛒 *PEDIDO #8899*');
    });
  });
});
