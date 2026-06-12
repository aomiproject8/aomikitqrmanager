"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { writeAuditLog } from "@/lib/audit"
import type { StepType } from "@/generated/prisma/client"

const STEP_TYPES = [
  "CLEANSER",
  "TONER",
  "SERUM",
  "CREAM",
  "SUNSCREEN",
  "EXFOLIANT",
  "TREATMENT",
  "MOISTURIZER",
] as const

export type ReplacementActionState = { error?: string; ok?: boolean }

const AddSchema = z.object({
  replacementProductId: z.string().min(1, "Select a replacement product"),
  stepType: z.enum(STEP_TYPES),
})

export async function addReplacementRule(
  sourceProductId: string,
  _prevState: ReplacementActionState,
  formData: FormData
): Promise<ReplacementActionState> {
  const session = await requireRole("ADMIN")

  const parsed = AddSchema.safeParse({
    replacementProductId: formData.get("replacementProductId"),
    stepType: formData.get("stepType"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { replacementProductId, stepType } = parsed.data

  if (replacementProductId === sourceProductId) {
    return { error: "A product cannot replace itself" }
  }

  const replacement = await prisma.product.findUnique({
    where: { id: replacementProductId },
    select: { id: true, name: true },
  })
  if (!replacement) return { error: "Replacement product not found" }

  const existing = await prisma.productReplacement.findUnique({
    where: {
      sourceProductId_replacementProductId: {
        sourceProductId,
        replacementProductId,
      },
    },
    select: { id: true },
  })
  if (existing) return { error: "This replacement rule already exists" }

  const rule = await prisma.productReplacement.create({
    data: {
      sourceProductId,
      replacementProductId,
      stepType: stepType as StepType,
    },
  })

  await writeAuditLog(
    session.user.id,
    "CREATE",
    "ProductReplacement",
    rule.id,
    { sourceProductId, replacementProductId, stepType }
  )

  revalidatePath(`/admin/products/${sourceProductId}`)
  return { ok: true }
}

export async function deleteReplacementRule(
  sourceProductId: string,
  _prevState: ReplacementActionState,
  formData: FormData
): Promise<ReplacementActionState> {
  const session = await requireRole("ADMIN")
  const ruleId = formData.get("ruleId") as string
  if (!ruleId) return { error: "Missing rule id" }

  const rule = await prisma.productReplacement.findUnique({
    where: { id: ruleId },
    select: { id: true, sourceProductId: true },
  })
  if (!rule || rule.sourceProductId !== sourceProductId) {
    return { error: "Rule not found" }
  }

  await prisma.productReplacement.delete({ where: { id: ruleId } })

  await writeAuditLog(
    session.user.id,
    "DELETE",
    "ProductReplacement",
    ruleId,
    { sourceProductId }
  )

  revalidatePath(`/admin/products/${sourceProductId}`)
  return { ok: true }
}
