/**
 * Routines Excel importer (multi-sheet, cross-referenced).
 *
 * Workbook: AOMI_ROUTINES_TEMPLATE_V1.xlsx — sheets Instructions, Routines,
 * Routine Diagnoses, Routine Steps, Lookups.
 *
 * `routineKey` is a workbook-local handle joining the three data sheets; it is
 * NOT a database id. Validation enforces unique keys, existing active
 * routine-type/diagnosis/product references, product↔step stepType alignment,
 * unique routine/diagnosis pairs, unique positive step numbers, and rejects
 * dangling cross-sheet references. The whole confirmed import runs in one
 * transaction with a single audit entry; a failure leaves no partial data.
 */

import type ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { writeAuditLog } from "@/lib/audit"
import { toSlug } from "@/lib/slug"
import type { StepType } from "@/generated/prisma/client"
import {
  extractSheet,
  parseExcelBoolean,
  loadWorkbook,
  type ImportError,
  type ImportPreview,
  type ImportCommitResult,
} from "./core"
import { STEP_TYPES } from "./products"

export const ROUTINES_SHEET = "Routines"
export const ROUTINE_DIAGNOSES_SHEET = "Routine Diagnoses"
export const ROUTINE_STEPS_SHEET = "Routine Steps"

export const ROUTINES_COLUMNS = [
  "routineKey",
  "name",
  "routineTypeSlug",
  "durationDays",
  "description",
  "generalInstructions",
  "isActive",
] as const
export const ROUTINE_DIAGNOSES_COLUMNS = ["routineKey", "diagnosisSlug"] as const
export const ROUTINE_STEPS_COLUMNS = [
  "routineKey",
  "stepNumber",
  "stepType",
  "defaultProductSku",
  "instruction",
] as const

const ENTITY = "routines"

export interface RoutineLookups {
  /** slug → id, active routine types only. */
  routineTypeIdBySlug: Map<string, string>
  /** slug → id, active diagnoses only. */
  diagnosisIdBySlug: Map<string, string>
  /** SKU → product, active products only. */
  productBySku: Map<string, { id: string; stepType: StepType }>
}

interface StepCandidate {
  stepNumber: number
  stepType: StepType
  defaultProductId: string | null
  instruction: string | null
}

export interface RoutineCandidate {
  rowNumber: number
  routineKey: string
  name: string
  routineTypeId: string
  durationDays: number | null
  description: string | null
  generalInstructions: string | null
  isActive: boolean
  diagnosisIds: string[]
  steps: StepCandidate[]
}

export interface ParsedRoutines {
  totalRows: number
  candidates: RoutineCandidate[]
  invalidKeys: Set<string>
  errors: ImportError[]
}

export function parseRoutines(
  workbook: ExcelJS.Workbook,
  lookups: RoutineLookups
): ParsedRoutines {
  const errors: ImportError[] = []

  const routinesExtract = extractSheet(workbook, ROUTINES_SHEET, [
    ...ROUTINES_COLUMNS,
  ])
  const diagExtract = extractSheet(workbook, ROUTINE_DIAGNOSES_SHEET, [
    ...ROUTINE_DIAGNOSES_COLUMNS,
  ])
  const stepsExtract = extractSheet(workbook, ROUTINE_STEPS_SHEET, [
    ...ROUTINE_STEPS_COLUMNS,
  ])
  errors.push(...routinesExtract.errors, ...diagExtract.errors, ...stepsExtract.errors)

  // A missing required sheet is fatal for the whole import.
  const sheetMissing = errors.some((e) => e.row === 0 && e.message.includes("missing"))
  if (sheetMissing) {
    return { totalRows: 0, candidates: [], invalidKeys: new Set(), errors }
  }

  // Index routine keys and detect duplicates.
  const routineRowByKey = new Map<string, (typeof routinesExtract.rows)[number]>()
  const keyCounts = new Map<string, number>()
  for (const row of routinesExtract.rows) {
    const key = row.values.routineKey.trim()
    if (key) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
  }

  // Group child rows by routineKey; flag dangling references.
  const diagByKey = new Map<string, { rowNumber: number; slug: string }[]>()
  for (const row of diagExtract.rows) {
    const key = row.values.routineKey.trim()
    if (!key || !keyCounts.has(key)) {
      errors.push({
        sheet: ROUTINE_DIAGNOSES_SHEET,
        row: row.rowNumber,
        field: "routineKey",
        message: `routineKey "${key}" does not exist in the ${ROUTINES_SHEET} sheet`,
      })
      continue
    }
    const slug = toSlug(row.values.diagnosisSlug)
    const list = diagByKey.get(key) ?? []
    list.push({ rowNumber: row.rowNumber, slug })
    diagByKey.set(key, list)
  }

  const stepsByKey = new Map<
    string,
    { rowNumber: number; stepNumberRaw: string; stepTypeRaw: string; sku: string; instruction: string }[]
  >()
  for (const row of stepsExtract.rows) {
    const key = row.values.routineKey.trim()
    if (!key || !keyCounts.has(key)) {
      errors.push({
        sheet: ROUTINE_STEPS_SHEET,
        row: row.rowNumber,
        field: "routineKey",
        message: `routineKey "${key}" does not exist in the ${ROUTINES_SHEET} sheet`,
      })
      continue
    }
    const list = stepsByKey.get(key) ?? []
    list.push({
      rowNumber: row.rowNumber,
      stepNumberRaw: row.values.stepNumber.trim(),
      stepTypeRaw: row.values.stepType.trim().toUpperCase(),
      sku: row.values.defaultProductSku.trim().toUpperCase(),
      instruction: row.values.instruction.trim(),
    })
    stepsByKey.set(key, list)
  }

  const candidates: RoutineCandidate[] = []
  const invalidKeys = new Set<string>()

  for (const row of routinesExtract.rows) {
    const r = row.rowNumber
    const key = row.values.routineKey.trim()
    let invalid = false
    const fail = (sheet: string, rowNum: number, field: string, message: string) => {
      errors.push({ sheet, row: rowNum, field, message })
      invalid = true
      if (key) invalidKeys.add(key)
    }

    if (!key) fail(ROUTINES_SHEET, r, "routineKey", "routineKey is required")
    else if ((keyCounts.get(key) ?? 0) > 1)
      fail(ROUTINES_SHEET, r, "routineKey", "Duplicate routineKey within the file")
    else routineRowByKey.set(key, row)

    const name = row.values.name.trim()
    const routineTypeSlug = toSlug(row.values.routineTypeSlug)
    const durationRaw = row.values.durationDays.trim()
    const description = row.values.description.trim()
    const generalInstructions = row.values.generalInstructions.trim()
    const isActiveRaw = row.values.isActive.trim()

    if (!name) fail(ROUTINES_SHEET, r, "name", "Name is required")
    else if (name.length > 200) fail(ROUTINES_SHEET, r, "name", "Name exceeds 200 characters")

    let routineTypeId = ""
    if (!row.values.routineTypeSlug.trim())
      fail(ROUTINES_SHEET, r, "routineTypeSlug", "routineTypeSlug is required")
    else {
      const id = lookups.routineTypeIdBySlug.get(routineTypeSlug)
      if (!id)
        fail(
          ROUTINES_SHEET,
          r,
          "routineTypeSlug",
          `Unknown or inactive routine type "${row.values.routineTypeSlug}"`
        )
      else routineTypeId = id
    }

    let durationDays: number | null = null
    if (durationRaw) {
      const n = Number(durationRaw)
      if (!Number.isInteger(n) || n <= 0)
        fail(ROUTINES_SHEET, r, "durationDays", "durationDays must be a positive integer")
      else durationDays = n
    }

    if (description.length > 2000)
      fail(ROUTINES_SHEET, r, "description", "Description exceeds 2000 characters")
    if (generalInstructions.length > 4000)
      fail(
        ROUTINES_SHEET,
        r,
        "generalInstructions",
        "generalInstructions exceeds 4000 characters"
      )

    let isActive = true
    if (isActiveRaw) {
      const b = parseExcelBoolean(isActiveRaw)
      if (b === null) fail(ROUTINES_SHEET, r, "isActive", `Invalid boolean "${isActiveRaw}"`)
      else isActive = b
    }

    // ── Diagnoses for this routine ──
    const diagnosisIds: string[] = []
    const seenDiagnoses = new Set<string>()
    for (const d of diagByKey.get(key) ?? []) {
      if (!d.slug) {
        fail(ROUTINE_DIAGNOSES_SHEET, d.rowNumber, "diagnosisSlug", "diagnosisSlug is required")
        continue
      }
      if (seenDiagnoses.has(d.slug)) {
        fail(
          ROUTINE_DIAGNOSES_SHEET,
          d.rowNumber,
          "diagnosisSlug",
          "Duplicate routine/diagnosis pair"
        )
        continue
      }
      seenDiagnoses.add(d.slug)
      const id = lookups.diagnosisIdBySlug.get(d.slug)
      if (!id) {
        fail(
          ROUTINE_DIAGNOSES_SHEET,
          d.rowNumber,
          "diagnosisSlug",
          `Unknown or inactive diagnosis "${d.slug}"`
        )
        continue
      }
      diagnosisIds.push(id)
    }

    // ── Steps for this routine ──
    const steps: StepCandidate[] = []
    const seenStepNumbers = new Set<number>()
    const stepRows = stepsByKey.get(key) ?? []
    if (key && stepRows.length === 0) {
      fail(ROUTINES_SHEET, r, "—", "Routine has no steps in the Routine Steps sheet")
    }
    for (const s of stepRows) {
      let stepInvalid = false
      const sFail = (field: string, message: string) => {
        fail(ROUTINE_STEPS_SHEET, s.rowNumber, field, message)
        stepInvalid = true
      }

      const stepNumber = Number(s.stepNumberRaw)
      if (!s.stepNumberRaw) sFail("stepNumber", "stepNumber is required")
      else if (!Number.isInteger(stepNumber) || stepNumber <= 0)
        sFail("stepNumber", "stepNumber must be a positive integer")
      else if (seenStepNumbers.has(stepNumber))
        sFail("stepNumber", `Duplicate step number ${stepNumber} within the routine`)

      if (!s.stepTypeRaw) sFail("stepType", "stepType is required")
      else if (!STEP_TYPES.includes(s.stepTypeRaw as StepType))
        sFail("stepType", `Invalid step type "${s.stepTypeRaw}"`)

      let defaultProductId: string | null = null
      if (s.sku) {
        const product = lookups.productBySku.get(s.sku)
        if (!product) sFail("defaultProductSku", `Unknown or inactive product "${s.sku}"`)
        else if (s.stepTypeRaw && product.stepType !== (s.stepTypeRaw as StepType))
          sFail(
            "defaultProductSku",
            `Product "${s.sku}" is ${product.stepType} but the step is ${s.stepTypeRaw}`
          )
        else defaultProductId = product.id
      }

      if (stepInvalid) continue
      seenStepNumbers.add(stepNumber)
      steps.push({
        stepNumber,
        stepType: s.stepTypeRaw as StepType,
        defaultProductId,
        instruction: s.instruction || null,
      })
    }

    if (invalid || !key) continue
    candidates.push({
      rowNumber: r,
      routineKey: key,
      name,
      routineTypeId,
      durationDays,
      description: description || null,
      generalInstructions: generalInstructions || null,
      isActive,
      diagnosisIds,
      steps: steps.sort((a, b) => a.stepNumber - b.stepNumber),
    })
  }

  return {
    totalRows: routinesExtract.rows.length,
    candidates,
    invalidKeys,
    errors,
  }
}

export function buildRoutinesPreview(
  parsed: ParsedRoutines,
  existingNames: Set<string>
): ImportPreview {
  const createSamples: string[] = []
  const skipSamples: string[] = []
  let toCreate = 0
  let toSkip = 0

  for (const c of parsed.candidates) {
    if (existingNames.has(c.name.toLowerCase())) {
      toSkip++
      if (skipSamples.length < 20) skipSamples.push(c.name)
    } else {
      toCreate++
      if (createSamples.length < 20)
        createSamples.push(`${c.name} (${c.steps.length} steps)`)
    }
  }

  return {
    entity: ENTITY,
    totalRows: parsed.totalRows,
    toCreate,
    toSkip,
    invalid: parsed.invalidKeys.size,
    errors: parsed.errors,
    createSamples,
    skipSamples,
  }
}

// ── DB-backed wrappers ────────────────────────────────────────────────────────

async function loadLookups(): Promise<RoutineLookups> {
  const [routineTypes, diagnoses, products] = await Promise.all([
    prisma.routineType.findMany({
      where: { active: true },
      select: { id: true, slug: true },
    }),
    prisma.diagnosis.findMany({
      where: { active: true },
      select: { id: true, slug: true },
    }),
    prisma.product.findMany({
      where: { active: true, sku: { not: null } },
      select: { id: true, sku: true, stepType: true },
    }),
  ])
  return {
    routineTypeIdBySlug: new Map(routineTypes.map((rt) => [rt.slug, rt.id])),
    diagnosisIdBySlug: new Map(diagnoses.map((d) => [d.slug, d.id])),
    productBySku: new Map(
      products.map((p) => [p.sku!.toUpperCase(), { id: p.id, stepType: p.stepType }])
    ),
  }
}

async function existingNameSet(names: string[]): Promise<Set<string>> {
  if (names.length === 0) return new Set()
  const found = await prisma.routineTemplate.findMany({
    where: { name: { in: names } },
    select: { name: true },
  })
  return new Set(found.map((r) => r.name.toLowerCase()))
}

export async function previewRoutinesImport(
  buffer: Buffer
): Promise<ImportPreview> {
  const workbook = await loadWorkbook(buffer)
  const lookups = await loadLookups()
  const parsed = parseRoutines(workbook, lookups)
  const existing = await existingNameSet(parsed.candidates.map((c) => c.name))
  return buildRoutinesPreview(parsed, existing)
}

export async function commitRoutinesImport(
  buffer: Buffer,
  userId: string | null
): Promise<ImportCommitResult> {
  // Revalidate against fresh lookups immediately before writing.
  const workbook = await loadWorkbook(buffer)
  const lookups = await loadLookups()
  const parsed = parseRoutines(workbook, lookups)
  const existing = await existingNameSet(parsed.candidates.map((c) => c.name))

  const toCreate = parsed.candidates.filter(
    (c) => !existing.has(c.name.toLowerCase())
  )
  const skipped = parsed.candidates.length - toCreate.length

  let created = 0
  if (toCreate.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const c of toCreate) {
        await tx.routineTemplate.create({
          data: {
            name: c.name,
            description: c.description,
            routineTypeId: c.routineTypeId,
            durationDays: c.durationDays,
            generalInstructions: c.generalInstructions,
            active: c.isActive,
            diagnoses: {
              create: c.diagnosisIds.map((diagnosisId) => ({ diagnosisId })),
            },
            steps: {
              create: c.steps.map((s) => ({
                stepNumber: s.stepNumber,
                stepType: s.stepType,
                defaultProductId: s.defaultProductId,
                instruction: s.instruction,
              })),
            },
          },
        })
      }
      created = toCreate.length
      await writeAuditLog(
        userId,
        "IMPORT",
        "RoutineTemplate",
        "bulk",
        { entity: ENTITY, created, skipped },
        tx
      )
    })
  }

  return {
    entity: ENTITY,
    created,
    skipped,
    invalid: parsed.invalidKeys.size,
    errors: parsed.errors,
  }
}
