"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth-helpers"
import {
  readUploadBuffer,
  type ImportActionState,
} from "@/lib/server/excel/action-helpers"
import {
  previewRoutineTypesImport,
  commitRoutineTypesImport,
} from "@/lib/server/excel/routine-types"

export async function previewRoutineTypesExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    return {
      phase: "preview",
      preview: await previewRoutineTypesImport(read.buffer),
    }
  } catch {
    return {
      phase: "error",
      error: "Could not read the workbook. Make sure it is a valid .xlsx file.",
    }
  }
}

export async function commitRoutineTypesExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const session = await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    const result = await commitRoutineTypesImport(read.buffer, session.user.id)
    revalidatePath("/admin/routine-types")
    return { phase: "result", result }
  } catch {
    return { phase: "error", error: "Import failed. No changes were saved." }
  }
}
