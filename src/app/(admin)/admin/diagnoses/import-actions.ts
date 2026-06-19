"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth-helpers"
import {
  readUploadBuffer,
  type ImportActionState,
} from "@/lib/server/excel/action-helpers"
import {
  previewDiagnosesImport,
  commitDiagnosesImport,
} from "@/lib/server/excel/diagnoses"

export async function previewDiagnosesExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    return { phase: "preview", preview: await previewDiagnosesImport(read.buffer) }
  } catch {
    return {
      phase: "error",
      error: "Could not read the workbook. Make sure it is a valid .xlsx file.",
    }
  }
}

export async function commitDiagnosesExcel(
  _prev: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const session = await requireRole("ADMIN")
  const read = await readUploadBuffer(formData)
  if (!read.ok) return { phase: "error", error: read.error }
  try {
    const result = await commitDiagnosesImport(read.buffer, session.user.id)
    revalidatePath("/admin/diagnoses")
    return { phase: "result", result }
  } catch {
    return { phase: "error", error: "Import failed. No changes were saved." }
  }
}
