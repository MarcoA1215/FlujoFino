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

