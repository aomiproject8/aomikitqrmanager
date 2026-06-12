"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { writeAuditLog } from "@/lib/audit"

export type TokenActionState = { error?: string; ok?: boolean }

/**
 * Void a token. Only AVAILABLE or ASSIGNED tokens may be voided. Uses
 * updateMany with a status guard so a concurrent assignment/activation cannot
 * be clobbered.
 */
export async function voidToken(
  _prevState: TokenActionState,
  formData: FormData
): Promise<TokenActionState> {
  const session = await requireRole("ADMIN")
  const id = formData.get("id") as string
  if (!id) return { error: "Missing token id" }

  const result = await prisma.qRToken.updateMany({
    where: { id, status: { in: ["AVAILABLE", "ASSIGNED"] } },
    data: { status: "VOIDED", voidedAt: new Date() },
  })

  if (result.count === 0) {
    return { error: "Token cannot be voided (already activated, voided, or replaced)" }
  }

  await writeAuditLog(session.user.id, "VOID", "QRToken", id)

  revalidatePath("/admin/qr-tokens")
  return { ok: true }
}
