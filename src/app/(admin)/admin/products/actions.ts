"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
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

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  sku: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  functionDescription: z.string().max(1000).optional(),
  stepType: z.enum(STEP_TYPES),
})

export type ProductActionState = {
  errors?: {
    name?: string[]
    sku?: string[]
    category?: string[]
    functionDescription?: string[]
    stepType?: string[]
  }
}

export async function createProduct(
  prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requireRole("ADMIN")

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    sku: (formData.get("sku") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    functionDescription: (formData.get("functionDescription") as string) || undefined,
    stepType: formData.get("stepType"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  if (parsed.data.sku) {
    const existing = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
      select: { id: true },
    })
    if (existing) return { errors: { sku: ["SKU already in use"] } }
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      category: parsed.data.category ?? null,
      functionDescription: parsed.data.functionDescription ?? null,
      stepType: parsed.data.stepType as StepType,
    },
  })

  await writeAuditLog(session.user.id, "CREATE", "Product", product.id, {
    name: product.name,
  })

  revalidatePath("/admin/products")
  redirect(`/admin/products/${product.id}?created=true`)
}

export async function updateProduct(
  id: string,
  prevState: ProductActionState,
  formData: FormData
): Promise<ProductActionState> {
  const session = await requireRole("ADMIN")

  const parsed = ProductSchema.safeParse({
    name: formData.get("name"),
    sku: (formData.get("sku") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    functionDescription: (formData.get("functionDescription") as string) || undefined,
    stepType: formData.get("stepType"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  if (parsed.data.sku) {
    const conflict = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
      select: { id: true },
    })
    if (conflict && conflict.id !== id) {
      return { errors: { sku: ["SKU already in use"] } }
    }
  }

  await prisma.product.update({
    where: { id },
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      category: parsed.data.category ?? null,
      functionDescription: parsed.data.functionDescription ?? null,
      stepType: parsed.data.stepType as StepType,
    },
  })

  await writeAuditLog(session.user.id, "UPDATE", "Product", id, {
    name: parsed.data.name,
  })

  revalidatePath("/admin/products")
  revalidatePath(`/admin/products/${id}`)
  redirect(`/admin/products/${id}`)
}

export async function toggleProductActive(formData: FormData) {
  const session = await requireRole("ADMIN")
  const id = formData.get("id") as string

  const product = await prisma.product.findUnique({
    where: { id },
    select: { active: true, name: true },
  })
  if (!product) return

  const next = !product.active
  await prisma.product.update({ where: { id }, data: { active: next } })

  await writeAuditLog(
    session.user.id,
    next ? "ACTIVATE" : "DEACTIVATE",
    "Product",
    id,
    { name: product.name }
  )

  revalidatePath("/admin/products")
  revalidatePath(`/admin/products/${id}`)
}
