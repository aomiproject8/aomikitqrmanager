import { requireRole } from "@/lib/auth-helpers"
import Link from "next/link"
import { createProduct } from "../actions"
import ProductForm from "../_components/product-form"

export const metadata = { title: "New Product — AOMI Kit Admin" }

export default async function NewProductPage() {
  await requireRole("ADMIN")

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/products" className="hover:underline">
            Products
          </Link>
          {" / "}
          <span>New</span>
        </nav>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          New product
        </h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ProductForm action={createProduct} />
      </div>
    </div>
  )
}
