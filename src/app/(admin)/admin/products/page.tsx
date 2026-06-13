import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil, Ban, CheckCircle, Plus, Eye, Box } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AdminFormSheet } from "@/components/ui/admin-form-sheet"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { toggleProductActive, createProduct, updateProduct } from "./actions"
import ProductForm from "./_components/product-form"

export const metadata = { title: "Products — AOMI Kit Admin" }

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string; edit?: string }>
}) {
  await requireRole("ADMIN")
  const { q, new: showNew, edit } = await searchParams

  const products = await prisma.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ stepType: "asc" }, { name: "asc" }],
  })

  const editItem = edit
    ? await prisma.product.findUnique({ where: { id: edit } })
    : null

  const isSheetOpen = !!edit || !!showNew
  const closeUrl = q ? `/admin/products?q=${q}` : "/admin/products"
  const formAction = editItem ? updateProduct.bind(null, editItem.id) : createProduct

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={
          <span>
            {products.length} product{products.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </span>
        }
        action={
          <Button asChild>
            <Link href={`/admin/products?new=true${q ? `&q=${q}` : ""}`}>
              <Plus className="mr-2 size-4" /> New product
            </Link>
          </Button>
        }
      />

      {/* Search */}
      <form method="GET" className="flex gap-2 max-w-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, SKU, category…"
          className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <Button type="submit" variant="outline" size="default">
          Search
        </Button>
        {q && (
          <Button variant="ghost" asChild>
            <Link href="/admin/products">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table / Empty state */}
      {products.length === 0 ? (
        q ? (
          <EmptyState
            icon={Box}
            title="No products found"
            description={`No products matched your search filter "${q}". Try clearing the search query.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/products">Clear Search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Box}
            title="No products yet"
            description="Create your first skincare product to catalog your treatments."
            action={
              <Button asChild>
                <Link href="/admin/products?new=true">
                  <Plus className="mr-2 size-4" /> New product
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Step Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-550 dark:text-zinc-400 whitespace-nowrap">
                      {p.sku ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {p.stepType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {p.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          p.active
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="Manage product details">
                              <Link href={`/admin/products/${p.id}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Manage product details (Images, Replacement Rules)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="Edit Product Attributes">
                              <Link href={`/admin/products?edit=${p.id}${q ? `&q=${q}` : ""}`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Product Info</TooltipContent>
                        </Tooltip>

                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={
                                      p.active
                                        ? "text-red-650 hover:text-red-750 dark:text-red-400"
                                        : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                    }
                                    aria-label={p.active ? "Deactivate Product" : "Activate Product"}
                                  >
                                    {p.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{p.active ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {p.active ? "Deactivate Product" : "Activate Product"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {p.active ? "deactivate" : "activate"} &quot;{p.name}&quot;?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <form action={toggleProductActive}>
                                <input type="hidden" name="id" value={p.id} />
                                <AlertDialogAction type="submit">
                                  {p.active ? "Deactivate" : "Activate"}
                                </AlertDialogAction>
                              </form>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminFormSheet
        open={isSheetOpen}
        title={editItem ? "Edit Product" : "New Product"}
        description={editItem ? `Update details for "${editItem.name}"` : "Create a new skincare product description."}
        closeUrl={closeUrl}
        className="w-full sm:max-w-xl md:max-w-2xl"
      >
        <ProductForm
          key={editItem?.id ?? "new"}
          action={formAction}
          defaultValues={editItem ?? undefined}
        />
      </AdminFormSheet>
    </div>
  )
}
