import { VENEZUELAN_BANKS, formatBankOptionLabel, normalizeBankName, type VenezuelanBank } from '@finowork/shared-types';

export { VENEZUELAN_BANKS, formatBankOptionLabel, normalizeBankName };
export type { VenezuelanBank };

/**
 * Retorna las opciones formateadas para selectores: { value, label, code, shortName }
 */
export const VENEZUELAN_BANK_OPTIONS = VENEZUELAN_BANKS.map((bank) => ({
  value: formatBankOptionLabel(bank),
  label: `${bank.code} - ${bank.name}`,
  shortName: bank.shortName,
  code: bank.code,
}));
