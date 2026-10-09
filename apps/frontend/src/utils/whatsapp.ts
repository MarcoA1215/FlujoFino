/**
 * Formatea y sanitiza un número de teléfono para generar URLs válidas de WhatsApp internacional (wa.me)
 * Si el número inicia con '0' (formato local ej. 0414...), se le añade el prefijo de país 58.
 */
export function formatWhatsAppUrl(phone: string | undefined | null, text?: string): string {
  if (!phone) {
    return text ? `https://wa.me/?text=${encodeURIComponent(text)}` : 'https://wa.me/';
  }

  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = `58${clean.slice(1)}`;
  }

  const base = `https://wa.me/${clean}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export interface WhatsAppOrderSummary {
  orderNumber?: string | number;
  customerName?: string;
  items: Array<{ name: string; quantity: number; priceUSD: number }>;
  deliveryFeeUSD?: number;
  totalUSD: number;
  totalBs?: number;
  paymentMethod?: string;
  notes?: string;
}

/**
 * Genera el texto estructurado del pedido para enviar por WhatsApp con desglose de ítems, montos y formato.
 */
export function buildWhatsAppOrderMessage(order: WhatsAppOrderSummary): string {
  const lines: string[] = [];
  const header = order.orderNumber ? `🛒 *PEDIDO #${order.orderNumber}*` : `🛒 *NUEVO PEDIDO*`;
  lines.push(header);

  if (order.customerName) {
    lines.push(`👤 *Cliente:* ${order.customerName}`);
  }

  lines.push('', '📋 *Detalle:*');
  for (const item of order.items) {
    lines.push(`• ${item.quantity}x ${item.name} - $${(item.quantity * item.priceUSD).toFixed(2)}`);
  }

  if (order.deliveryFeeUSD && order.deliveryFeeUSD > 0) {
    lines.push(`🛵 *Delivery:* $${order.deliveryFeeUSD.toFixed(2)}`);
  }

  lines.push('');
  const totalBsText = order.totalBs !== undefined ? ` / Bs. ${order.totalBs.toFixed(2)}` : '';
  lines.push(`💵 *TOTAL:* $${order.totalUSD.toFixed(2)}${totalBsText}`);

  if (order.paymentMethod) {
    lines.push(`💳 *Pago:* ${order.paymentMethod}`);
  }

  if (order.notes) {
    lines.push(`📝 *Notas:* ${order.notes}`);
  }

  return lines.join('\n');
}
