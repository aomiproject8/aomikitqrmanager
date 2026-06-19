/**
 * Shared Excel import/export framework.
 *
 * Common parsing, workbook reading, cell coercion, formula rejection, status
 * labelling, and types. Entity-specific schemas and transaction handlers live in
 * sibling files (products.ts, diagnoses.ts, routine-types.ts, routines.ts).
 *
 * Not marked `server-only` on purpose: it reads no secrets, and the standalone
 * test scripts exercise the parsing/template logic directly. The privileged
 * Server Actions that call it still enforce ADMIN authorization.
 */

import ExcelJS from "exceljs"

/** Hard upload ceiling enforced before any parsing. */
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
/** Maximum data rows accepted per sheet, to bound work and memory. */
export const MAX_IMPORT_ROWS = 5000

export type RowStatus = "CREATE" | "SKIP_EXISTING" | "ERROR"

export interface ImportError {
  sheet: string
  /** 1-based spreadsheet row number (matches what the admin sees in Excel). */
  row: number
  field: string
  message: string
}

export interface ImportPreview {
  entity: string
  totalRows: number
  toCreate: number
  toSkip: number
  invalid: number
  errors: ImportError[]
  /** Human-readable identifiers slated for creation (capped for display). */
  createSamples: string[]
  /** Identifiers that already exist and will be skipped (capped for display). */
  skipSamples: string[]
}

export interface ImportCommitResult {
  entity: string
  created: number
  skipped: number
  invalid: number
  errors: ImportError[]
}

/** A single extracted data row with its spreadsheet row number. */
export interface SheetRow {
  rowNumber: number
  values: Record<string, string>
}

export interface ExtractResult {
  rows: SheetRow[]
  errors: ImportError[]
}

/** Load an xlsx buffer into an ExcelJS workbook. Throws on malformed input. */
export async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  // exceljs pulls an older @types/node (via fast-csv) whose Buffer type diverges
  // from ours; cast to its own expected parameter type to bridge the two.
  type LoadBuffer = Parameters<typeof wb.xlsx.load>[0]
  await wb.xlsx.load(buffer as unknown as LoadBuffer)
  return wb
}

/**
 * Coerce an ExcelJS cell value to trimmed text.
 *
 * Returns `{ formula: true }` for formula cells so callers can reject them
 * (we never accept formulas where plain data is expected).
 */
export function readCellText(
  value: ExcelJS.CellValue
): { text: string } | { formula: true } {
  if (value == null) return { text: "" }
  if (typeof value === "string") return { text: value.trim() }
  if (typeof value === "number") return { text: String(value) }
  if (typeof value === "boolean") return { text: value ? "true" : "false" }
  if (value instanceof Date) return { text: value.toISOString() }

  if (typeof value === "object") {
    // Formula cell: { formula, result } — reject.
    if ("formula" in value || "sharedFormula" in value) return { formula: true }
    // Rich text: { richText: [{ text }] }
    if ("richText" in value && Array.isArray(value.richText)) {
      return { text: value.richText.map((r) => r.text).join("").trim() }
    }
    // Hyperlink: { text, hyperlink }
    if ("text" in value && typeof value.text === "string") {
      return { text: value.text.trim() }
    }
    if ("result" in value) return { text: String(value.result ?? "").trim() }
  }
  return { text: String(value).trim() }
}

/**
 * Extract rows from a named sheet given the required column headers (row 1).
 *
 * Produces sheet-level errors for a missing sheet, missing columns, or too many
 * rows, and per-cell errors for formula cells. Header matching is
 * case-insensitive; the returned record keys use the canonical header names.
 */
export function extractSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  columns: string[]
): ExtractResult {
  const errors: ImportError[] = []
  const ws = workbook.getWorksheet(sheetName)
  if (!ws) {
    errors.push({
      sheet: sheetName,
      row: 0,
      field: "—",
      message: `Required sheet "${sheetName}" is missing`,
    })
    return { rows: [], errors }
  }

  // Map canonical column → actual column index from the header row.
  const headerRow = ws.getRow(1)
  const headerIndex = new Map<string, number>()
  headerRow.eachCell((cell, colNumber) => {
    const parsed = readCellText(cell.value)
    if ("text" in parsed && parsed.text) {
      headerIndex.set(parsed.text.toLowerCase(), colNumber)
    }
  })

  const colToIndex = new Map<string, number>()
  for (const col of columns) {
    const idx = headerIndex.get(col.toLowerCase())
    if (idx == null) {
      errors.push({
        sheet: sheetName,
        row: 1,
        field: col,
        message: `Required column "${col}" is missing`,
      })
    } else {
      colToIndex.set(col, idx)
    }
  }
  if (errors.length > 0) return { rows: [], errors }

  const rows: SheetRow[] = []
  const lastRow = ws.rowCount
  if (lastRow - 1 > MAX_IMPORT_ROWS) {
    errors.push({
      sheet: sheetName,
      row: 0,
      field: "—",
      message: `Too many rows (${lastRow - 1}); maximum is ${MAX_IMPORT_ROWS}`,
    })
    return { rows: [], errors }
  }

  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r)
    const values: Record<string, string> = {}
    let hasFormula = false
    let hasAnyValue = false

    for (const col of columns) {
      const idx = colToIndex.get(col)!
      const parsed = readCellText(row.getCell(idx).value)
      if ("formula" in parsed) {
        hasFormula = true
        errors.push({
          sheet: sheetName,
          row: r,
          field: col,
          message: "Formulas are not allowed; use plain values",
        })
        values[col] = ""
      } else {
        values[col] = parsed.text
        if (parsed.text) hasAnyValue = true
      }
    }

    // Skip fully blank rows silently (trailing empties).
    if (!hasAnyValue && !hasFormula) continue
    rows.push({ rowNumber: r, values })
  }

  return { rows, errors }
}

/** Parse a spreadsheet boolean. Returns null for unrecognized values. */
export function parseExcelBoolean(raw: string): boolean | null {
  const v = raw.trim().toLowerCase()
  if (v === "") return null
  if (["true", "yes", "y", "1", "active"].includes(v)) return true
  if (["false", "no", "n", "0", "inactive"].includes(v)) return false
  return null
}

/** Create a new workbook for template/report generation. */
export function newWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = "AOMI Kit QR Manager"
  wb.created = new Date()
  return wb
}

/** Serialize a workbook to a Node Buffer. */
export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}
