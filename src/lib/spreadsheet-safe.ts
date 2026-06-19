/**
 * Formula-injection defense for values written into generated spreadsheets and
 * error reports. Pure and dependency-free so both server (template/report
 * generation) and client (CSV error-report download) can share one source of truth.
 *
 * A cell whose text begins with =, +, -, @, or a control character can be
 * interpreted as a formula by Excel/Sheets. Prefixing with a single quote forces
 * the spreadsheet to treat it as literal text.
 *
 * See: https://owasp.org/www-community/attacks/CSV_Injection
 */

const RISKY_PREFIX = /^[=+\-@\t\r]/

export function escapeSpreadsheetValue(value: unknown): string {
  if (value == null) return ""
  const str = String(value)
  if (RISKY_PREFIX.test(str)) return `'${str}`
  return str
}
