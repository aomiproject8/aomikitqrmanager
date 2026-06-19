/**
 * Shared helpers for the page-specific Excel import Server Actions.
 *
 * The Server Actions themselves enforce ADMIN authorization; these helpers only
 * parse and bound the upload and shape a serializable result state.
 */

import { MAX_IMPORT_FILE_BYTES, type ImportPreview, type ImportCommitResult } from "./core"

export interface ImportActionState {
  phase: "idle" | "preview" | "result" | "error"
  preview?: ImportPreview
  result?: ImportCommitResult
  error?: string
}

export async function readUploadBuffer(
  formData: FormData
): Promise<{ ok: true; buffer: Buffer } | { ok: false; error: string }> {
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, error: "No file was provided." }
  if (file.size === 0) return { ok: false, error: "The selected file is empty." }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, error: "File exceeds the 10 MB limit." }
  }
  const name = file.name.toLowerCase()
  if (!name.endsWith(".xlsx")) {
    return { ok: false, error: "Please upload an .xlsx workbook." }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  return { ok: true, buffer }
}

export type { ImportPreview, ImportCommitResult }
