"use server"

import Papa from "papaparse"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { writeAuditLog } from "@/lib/audit"
import {
  normalizeToken,
  isValidTokenFormat,
  DEFAULT_PREFIX,
} from "@/lib/token"

export type ImportState = {
  error?: string
  result?: {
    total: number
    inserted: number
    skippedDuplicate: number
    invalid: number
  }
}

/**
 * Import tokens from a pasted/uploaded CSV.
 *
 * - Accepts either a header row containing a `token` column, or a plain
 *   newline/comma separated list with no header.
 * - Dedupes within the file AND against the database.
 * - Inserts inside a single transaction.
 */
export async function importTokens(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const session = await requireRole("ADMIN")

  let csvText = (formData.get("csvText") as string) || ""
  const file = formData.get("file")
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return { error: "File too large (max 5MB)" }
    }
    csvText = await file.text()
  }

  csvText = csvText.trim()
  if (!csvText) return { error: "Provide CSV content or a file" }

  const batchName = (formData.get("batchName") as string)?.trim() || null

  // Extract raw token strings.
  const rawTokens: string[] = []
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const hasTokenColumn =
    Array.isArray(parsed.meta.fields) &&
    parsed.meta.fields.includes("token")

  if (hasTokenColumn) {
    for (const row of parsed.data) {
      if (row.token != null) rawTokens.push(String(row.token))
    }
  } else {
    // No usable header — treat every cell as a candidate token.
    const flat = Papa.parse<string[]>(csvText, { skipEmptyLines: true })
    for (const row of flat.data) {
      for (const cell of row) {
        if (cell != null && String(cell).trim()) rawTokens.push(String(cell))
      }
    }
  }

  const total = rawTokens.length
  if (total === 0) return { error: "No token values found in input" }

  // Normalize + validate + dedupe within file.
  const seenInFile = new Set<string>()
  const valid: string[] = []
  let invalid = 0
  let dupInFile = 0

  for (const raw of rawTokens) {
    const t = normalizeToken(raw)
    if (!t || !isValidTokenFormat(t)) {
      invalid += 1
      continue
    }
    if (seenInFile.has(t)) {
      dupInFile += 1
      continue
    }
    seenInFile.add(t)
    valid.push(t)
  }

  // Dedupe against DB.
  const existing = valid.length
    ? await prisma.qRToken.findMany({
        where: { token: { in: valid } },
        select: { token: true },
      })
    : []
  const existingSet = new Set(existing.map((e) => e.token))
  const toInsert = valid.filter((t) => !existingSet.has(t))
  const dupInDb = valid.length - toInsert.length
  const skippedDuplicate = dupInFile + dupInDb

  let inserted = 0
  if (toInsert.length > 0) {
    await prisma.$transaction(async (tx) => {
      const batch = await tx.qRTokenBatch.create({
        data: {
          batchName: batchName || `Imported ${new Date().toISOString().slice(0, 10)}`,
          prefix: DEFAULT_PREFIX,
          quantity: toInsert.length,
          source: "IMPORTED",
          createdByUserId: session.user.id,
        },
      })
      const res = await tx.qRToken.createMany({
        data: toInsert.map((token) => ({
          token,
          batchId: batch.id,
          status: "AVAILABLE" as const,
          importedByUserId: session.user.id,
        })),
        skipDuplicates: true,
      })
      inserted = res.count
    })
  }

  await writeAuditLog(session.user.id, "IMPORT_TOKENS", "QRToken", "bulk", {
    total,
    inserted,
    skippedDuplicate,
    invalid,
  })

  revalidatePath("/admin/qr-tokens")
  revalidatePath("/admin/batches")

  return {
    result: { total, inserted, skippedDuplicate, invalid },
  }
}
