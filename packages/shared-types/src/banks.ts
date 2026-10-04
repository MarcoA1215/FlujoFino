export interface VenezuelanBank {
  code: string;
  name: string;
  shortName: string;
}

export const VENEZUELAN_BANKS: VenezuelanBank[] = [
  // Bancos de mayor volumen / uso común
  { code: '0102', name: 'Banco de Venezuela', shortName: 'BDV' },
  { code: '0134', name: 'Banesco Banco Universal', shortName: 'Banesco' },
  { code: '0105', name: 'Banco Mercantil', shortName: 'Mercantil' },
  { code: '0108', name: 'BBVA Provincial', shortName: 'Provincial' },
  { code: '0191', name: 'BNC - Banco Nacional de Crédito', shortName: 'BNC' },
  { code: '0172', name: 'Bancamiga Banco Universal', shortName: 'Bancamiga' },
  { code: '0114', name: 'Bancaribe', shortName: 'Bancaribe' },
  { code: '0163', name: 'Banco del Tesoro', shortName: 'Tesoro' },
  { code: '0175', name: 'Banco Digital de los Trabajadores (Bicentenario)', shortName: 'Bicentenario' },
  { code: '0115', name: 'Banco Exterior', shortName: 'Exterior' },
  { code: '0174', name: 'Banplus Banco Universal', shortName: 'Banplus' },
  { code: '0151', name: 'BFC Banco Fondo Común', shortName: 'Fondo Común' },
  { code: '0171', name: 'Banco Activo', shortName: 'Activo' },
  { code: '0138', name: 'Banco Plaza', shortName: 'Banco Plaza' },
  { code: '0157', name: 'DelSur Banco Universal', shortName: 'DelSur' },
  { code: '0156', name: '100% Banco', shortName: '100% Banco' },
  { code: '0128', name: 'Banco Caroní', shortName: 'Caroní' },
  { code: '0168', name: 'Bancrecer', shortName: 'Bancrecer' },
  { code: '0166', name: 'Banco Agrícola de Venezuela', shortName: 'Agrícola' },
  { code: '0104', name: 'Banco Venezolano de Crédito', shortName: 'Venezolano de Crédito' },
  { code: '0177', name: 'BANFANB (Banco de la FANB)', shortName: 'BANFANB' },
  { code: '0169', name: 'Mi Banco', shortName: 'Mi Banco' },
  { code: '0137', name: 'Banco Sofitasa', shortName: 'Sofitasa' },
  { code: '0146', name: 'Bangente', shortName: 'Bangente' },
  { code: '0178', name: 'N58 Banco Digital Microfinanciero', shortName: 'N58' },
  { code: '0173', name: 'Banco Internacional de Desarrollo', shortName: 'BID' },
];

/**
 * Retorna etiqueta uniforme estándar: "0102 - Banco de Venezuela"
 */
export function formatBankOptionLabel(bank: VenezuelanBank): string {
  return `${bank.code} - ${bank.name}`;
}

/**
 * Normaliza cualquier texto previo ("vnzla", "venezuela", "0102", "Banesco")
 * hacia el formato oficial estándar "0102 - Banco de Venezuela".
 */
export function normalizeBankName(value: string | undefined | null): string {
  if (!value) return '';
  const clean = value.trim().toLowerCase();
  if (!clean) return '';

  const matched = VENEZUELAN_BANKS.find((b) => {
    const codeMatch = b.code === clean || clean.startsWith(b.code);
    const nameMatch = b.name.toLowerCase() === clean;
    const shortMatch = b.shortName.toLowerCase() === clean;
    if (codeMatch || nameMatch || shortMatch) return true;

    if (b.code === '0102' && (clean.includes('venezuela') || clean === 'bdv' || clean.includes('vnzla'))) return true;
    if (b.code === '0134' && clean.includes('banesco')) return true;
    if (b.code === '0105' && clean.includes('mercantil')) return true;
    if (b.code === '0108' && (clean.includes('provincial') || clean.includes('bbva'))) return true;
    if (b.code === '0191' && (clean.includes('bnc') || clean.includes('nacional de credito') || clean.includes('nacional de crédito'))) return true;
    if (b.code === '0172' && clean.includes('bancamiga')) return true;
    if (b.code === '0114' && clean.includes('bancaribe')) return true;
    if (b.code === '0163' && clean.includes('tesoro')) return true;
    if (b.code === '0175' && (clean.includes('bicentenario') || clean.includes('trabajadores'))) return true;
    if (b.code === '0115' && clean.includes('exterior')) return true;
    if (b.code === '0174' && clean.includes('banplus')) return true;
    if (b.code === '0151' && (clean.includes('fondo comun') || clean.includes('fondo común') || clean.includes('bfc'))) return true;
    if (b.code === '0171' && clean.includes('activo')) return true;
    if (b.code === '0138' && clean.includes('plaza')) return true;
    if (b.code === '0157' && clean.includes('delsur')) return true;
    if (b.code === '0156' && clean.includes('100%')) return true;
    if (b.code === '0128' && (clean.includes('caroni') || clean.includes('caroní'))) return true;
    if (b.code === '0168' && clean.includes('bancrecer')) return true;
    if (b.code === '0166' && (clean.includes('agricola') || clean.includes('agrícola'))) return true;
    if (b.code === '0104' && (clean.includes('venezolano de credito') || clean.includes('venezolano de crédito'))) return true;
    if (b.code === '0177' && clean.includes('fanb')) return true;
    if (b.code === '0169' && clean.includes('mi banco')) return true;
    if (b.code === '0137' && clean.includes('sofitasa')) return true;
    if (b.code === '0146' && clean.includes('bangente')) return true;
    if (b.code === '0178' && clean.includes('n58')) return true;
    if (b.code === '0173' && (clean.includes('bid') || clean.includes('internacional de desarrollo'))) return true;

    return false;
  });

  if (matched) {
    return formatBankOptionLabel(matched);
  }

  return value;
}
