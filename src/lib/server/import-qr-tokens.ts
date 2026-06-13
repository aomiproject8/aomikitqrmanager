import Papa from "papaparse"
import { prisma } from "@/lib/prisma"
import { normalizeToken, isValidTokenFormat, DEFAULT_PREFIX } from "@/lib/token"
import { writeAuditLog } from "@/lib/audit"

export type ImportResult = {
  totalRows: number
  inserted: number
  skippedDuplicate: number
  invalid: number
}

export async function processQRTokenImport({
  csvText,
  batchName,
  userId,
}: {
  csvText: string
  batchName: string | null
  userId: string
}): Promise<ImportResult> {
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

  const totalRows = rawTokens.length
  if (totalRows === 0) {
    return { totalRows: 0, inserted: 0, skippedDuplicate: 0, invalid: 0 }
  }

  const seenInFile = new Set<string>()
  const valid: string[] = []
  let invalid = 0
  let withinFileDuplicateCount = 0

  for (const raw of rawTokens) {
    const t = normalizeToken(raw)
    if (!t || !isValidTokenFormat(t)) {
      invalid += 1
      continue
    }
    if (seenInFile.has(t)) {
      withinFileDuplicateCount += 1
      continue
    }
    seenInFile.add(t)
    valid.push(t)
  }

  const existing = valid.length
    ? await prisma.qRToken.findMany({
        where: { token: { in: valid } },
        select: { token: true },
      })
    : []
  const existingSet = new Set(existing.map((e) => e.token))
  const candidates = valid.filter((t) => !existingSet.has(t))
  const preExistingUniqueCount = valid.length - candidates.length

  if (candidates.length === 0) {
    const skippedDuplicate = withinFileDuplicateCount + preExistingUniqueCount
    if (totalRows !== invalid + skippedDuplicate + 0) {
      console.warn("Assertion failed: counters do not match invariant")
    }
    await writeAuditLog(userId, "IMPORT_TOKENS", "QRToken", "bulk", {
      total: totalRows,
      inserted: 0,
      skippedDuplicate,
      invalid,
    })
    return {
      totalRows,
      inserted: 0,
      skippedDuplicate,
      invalid,
    }
  }

  let actualInsertedCount = 0

  await prisma.$transaction(async (tx) => {
    const batch = await tx.qRTokenBatch.create({
      data: {
        batchName: batchName || `Imported ${new Date().toISOString().slice(0, 10)}`,
        prefix: DEFAULT_PREFIX,
        quantity: candidates.length,
        source: "IMPORTED",
        createdByUserId: userId,
      },
    })

    const res = await tx.qRToken.createMany({
      data: candidates.map((token) => ({
        token,
        batchId: batch.id,
        status: "AVAILABLE" as const,
        importedByUserId: userId,
      })),
      skipDuplicates: true,
    })

    actualInsertedCount = res.count

    if (actualInsertedCount === 0) {
      await tx.qRTokenBatch.delete({
        where: { id: batch.id },
      })
    } else if (actualInsertedCount < candidates.length) {
      await tx.qRTokenBatch.update({
        where: { id: batch.id },
        data: { quantity: actualInsertedCount },
      })
    }

    const concurrentDuplicates = candidates.length - actualInsertedCount
    const skippedDuplicate = withinFileDuplicateCount + preExistingUniqueCount + concurrentDuplicates

    // Write a final IMPORT_TOKENS audit log entry inside the transaction.
    await writeAuditLog(
      userId,
      "IMPORT_TOKENS",
      "QRToken",
      "bulk",
      {
        total: totalRows,
        inserted: actualInsertedCount,
        skippedDuplicate,
        invalid,
      },
      tx
    )
  })

  const concurrentDuplicates = candidates.length - actualInsertedCount
  const skippedDuplicate = withinFileDuplicateCount + preExistingUniqueCount + concurrentDuplicates

  if (totalRows !== invalid + skippedDuplicate + actualInsertedCount) {
    throw new Error(`Invariant failed: ${totalRows} != ${invalid} + ${skippedDuplicate} + ${actualInsertedCount}`)
  }

  return {
    totalRows,
    inserted: actualInsertedCount,
    skippedDuplicate,
    invalid,
  }
}
