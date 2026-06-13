"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth-helpers"
import { processQRTokenImport } from "@/lib/server/import-qr-tokens"

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

  const { totalRows, inserted, skippedDuplicate, invalid } = await processQRTokenImport({
    csvText,
    batchName,
    userId: session.user.id,
  })

  revalidatePath("/admin/qr-tokens")
  revalidatePath("/admin/batches")

  return {
    result: { total: totalRows, inserted, skippedDuplicate, invalid },
  }
}

