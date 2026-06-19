"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth-helpers"
import {
  readUploadBuffer,
  type ImportActionState,
} from "@/lib/server/excel/action-helpers"
import {
  previewProductsImport,
  commitProductsImport,
} from "@/lib/server/excel/products"

export async function previewProductsExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    return { phase: "preview", preview: await previewProductsImport(read.buffer) }
  } catch {
    return {
      phase: "error",
      error: "Could not read the workbook. Make sure it is a valid .xlsx file.",
    }
  }
}

export async function commitProductsExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const session = await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    const result = await commitProductsImport(read.buffer, session.user.id)
    revalidatePath("/admin/products")
    return { phase: "result", result }
  } catch {
    return { phase: "error", error: "Import failed. No changes were saved." }
  }
}
