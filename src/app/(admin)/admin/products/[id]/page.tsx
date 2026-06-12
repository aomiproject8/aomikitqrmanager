import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { updateProduct, toggleProductActive } from "../actions"
import ProductForm from "../_components/product-form"
import ProductImages from "./_components/product-images"
import ReplacementRules from "./_components/replacement-rules"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  })
  return { title: product ? `${product.name} — AOMI Kit Admin` : "Product" }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("ADMIN")
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      replacementSources: {
        orderBy: { createdAt: "asc" },
        include: {
          replacement: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  })
  if (!product) notFound()

  const otherProducts = await prisma.product.findMany({
    where: { active: true, id: { not: id } },
    orderBy: [{ stepType: "asc" }, { name: "asc" }],
    select: { id: true, name: true, stepType: true },
  })

  const action = updateProduct.bind(null, id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/products" className="hover:underline">
              Products
            </Link>
            {" / "}
            <span>{product.name}</span>
          </nav>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {product.active ? (
              <span className="text-emerald-600 dark:text-emerald-400">Active</span>
            ) : (
              <span className="text-zinc-400">Inactive</span>
            )}
            {product.sku && (
              <>
                {" · "}
                <span className="font-mono">{product.sku}</span>
              </>
            )}
          </p>
        </div>

        {/* Toggle active */}
        <form action={toggleProductActive}>
          <input type="hidden" name="id" value={product.id} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className={
              product.active
                ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950"
            }
          >
            {product.active ? "Deactivate" : "Activate"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ProductForm action={action} defaultValues={product} />
      </div>

      {/* Images */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ProductImages productId={product.id} images={product.images} />
      </div>

      {/* Replacement rules */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ReplacementRules
          sourceProductId={product.id}
          sourceStepType={product.stepType}
          rules={product.replacementSources}
          products={otherProducts}
        />
      </div>
    </div>
  )
}
