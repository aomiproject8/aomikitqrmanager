import { requireRole } from "@/lib/auth-helpers"
import Link from "next/link"
import GenerateForm from "./_generate-form"

export const metadata = { title: "Generate QR Tokens — AOMI Kit Admin" }

export default async function GeneratePage() {
  await requireRole("ADMIN")

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/qr-tokens" className="hover:underline">
            QR Tokens
          </Link>
          {" / Generate"}
        </nav>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Generate token batch
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Creates a new batch of AVAILABLE tokens.
        </p>
      </div>

      <div className="max-w-lg rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <GenerateForm />
      </div>
    </div>
  )
}
