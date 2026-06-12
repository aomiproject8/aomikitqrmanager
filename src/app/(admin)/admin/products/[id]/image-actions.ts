"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { writeAuditLog } from "@/lib/audit"
import {
  getSupabaseAdmin,
  productImagePublicUrl,
  PRODUCT_IMAGES_BUCKET,
} from "@/lib/supabase-server"
import type { ImageType } from "@/generated/prisma/client"

const IMAGE_TYPES = ["FRONT", "SECONDARY", "REFERENCE"] as const
const MAX_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export type ImageActionState = { error?: string; ok?: boolean }

export async function uploadProductImage(
  productId: string,
  _prevState: ImageActionState,
  formData: FormData
): Promise<ImageActionState> {
  const session = await requireRole("ADMIN")

  const file = formData.get("file")
  const imageType = formData.get("imageType")

  const typeParse = z.enum(IMAGE_TYPES).safeParse(imageType)
  if (!typeParse.success) return { error: "Invalid image type" }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file selected" }
  }
  if (file.size > MAX_BYTES) {
    return { error: "File too large (max 5MB)" }
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { error: "Unsupported file type. Use JPEG, PNG, WebP, or GIF." }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })
  if (!product) return { error: "Product not found" }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
  const objectPath = `${productId}/${crypto.randomUUID()}.${ext}`

  const supabase = getSupabaseAdmin()
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  const imageUrl = productImagePublicUrl(objectPath)

  const last = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  })

  const image = await prisma.productImage.create({
    data: {
      productId,
      imageUrl,
      imageType: typeParse.data as ImageType,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  })

  await writeAuditLog(session.user.id, "UPLOAD_IMAGE", "ProductImage", image.id, {
    productId,
    imageType: typeParse.data,
    objectPath,
  })

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true }
}

export async function deleteProductImage(
  productId: string,
  _prevState: ImageActionState,
  formData: FormData
): Promise<ImageActionState> {
  const session = await requireRole("ADMIN")
  const imageId = formData.get("imageId") as string
  if (!imageId) return { error: "Missing image id" }

  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    select: { id: true, productId: true, imageUrl: true },
  })
  if (!image || image.productId !== productId) {
    return { error: "Image not found" }
  }

  // Best-effort remove from storage. Object path is everything after the bucket.
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`
  const idx = image.imageUrl.indexOf(marker)
  if (idx !== -1) {
    const objectPath = image.imageUrl.slice(idx + marker.length)
    await getSupabaseAdmin()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .remove([objectPath])
  }

  await prisma.productImage.delete({ where: { id: imageId } })

  await writeAuditLog(session.user.id, "DELETE_IMAGE", "ProductImage", imageId, {
    productId,
  })

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true }
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[]
): Promise<ImageActionState> {
  const session = await requireRole("ADMIN")

  const images = await prisma.productImage.findMany({
    where: { productId },
    select: { id: true },
  })
  const ownedIds = new Set(images.map((i) => i.id))
  const filtered = orderedIds.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    filtered.map((id, index) =>
      prisma.productImage.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  )

  await writeAuditLog(session.user.id, "REORDER_IMAGES", "Product", productId, {
    order: filtered,
  })

  revalidatePath(`/admin/products/${productId}`)
  return { ok: true }
}
