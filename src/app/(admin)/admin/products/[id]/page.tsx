import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { updateProduct, toggleProductActive } from "../actions"
import ProductForm from "../_components/product-form"
import ProductImages from "./_components/product-images"
import ReplacementRules from "./_components/replacement-rules"
import { PageHeader } from "@/components/ui/page-header"

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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  await requireRole("ADMIN")
  const { id } = await params
  const sp = await searchParams
  const isCreated = sp.created === "true"

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
    <div className="space-y-8">
      {isCreated && (
        <div className="rounded-lg border border-emerald-250 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          Product created. You can now add images and replacement rules from Manage product details.
        </div>
      )}

      <PageHeader
        title={product.name}
        description={
          <div className="space-y-1">
            <nav className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              <Link href="/admin/products" className="hover:underline">
                Products
              </Link>
              <span>/</span>
              <span className="text-zinc-700 dark:text-zinc-350 font-medium">{product.name}</span>
            </nav>
            <div className="flex items-center gap-2 text-sm pt-1">
              <span
                className={
                  product.active
                    ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "inline-flex items-center rounded-full bg-zinc-150 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }
              >
                {product.active ? "Active" : "Inactive"}
              </span>
              {product.sku && (
                <span className="font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                  · SKU: {product.sku}
                </span>
              )}
            </div>
          </div>
        }
        action={
          <form action={toggleProductActive}>
            <input type="hidden" name="id" value={product.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className={
                product.active
                  ? "text-red-650 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/20"
                  : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950/20"
              }
            >
              {product.active ? "Deactivate" : "Activate"}
            </Button>
          </form>
        }
      />

      {/* Section 1: Basic Attributes */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Basic Attributes</h2>
          <p className="text-sm text-zinc-500">Core identity, category, and step classification for the product.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ProductForm action={action} defaultValues={product} />
        </div>
      </div>

      {/* Section 2: Product Images */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Product Images</h2>
          <p className="text-sm text-zinc-500">Upload primary, secondary, and reference photos for the product.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ProductImages productId={product.id} images={product.images} />
        </div>
      </div>

      {/* Section 3: Replacement Rules */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Replacement Rules</h2>
          <p className="text-sm text-zinc-500">Define which products can replace this one in routine templates if unavailable.</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <ReplacementRules
            sourceProductId={product.id}
            sourceStepType={product.stepType}
            rules={product.replacementSources}
            products={otherProducts}
          />
        </div>
      </div>
    </div>
  )
}
