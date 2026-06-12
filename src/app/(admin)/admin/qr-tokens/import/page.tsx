import { requireRole } from "@/lib/auth-helpers"
import Link from "next/link"
import ImportForm from "./_import-form"

export const metadata = { title: "Import QR Tokens — AOMI Kit Admin" }

export default async function ImportPage() {
  await requireRole("ADMIN")

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/qr-tokens" className="hover:underline">
            QR Tokens
          </Link>
          {" / Import"}
        </nav>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Import tokens from CSV
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Paste CSV or upload a file. A <code>token</code> column is used if
          present; otherwise every cell is treated as a token. Duplicates within
          the file and against the database are skipped.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <ImportForm />
      </div>
    </div>
  )
}
