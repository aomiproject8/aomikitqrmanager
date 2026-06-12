import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import VoidTokenButton from "./_components/void-token-button"
import type { Prisma, QRTokenStatus } from "@/generated/prisma/client"

export const metadata = { title: "QR Tokens — AOMI Kit Admin" }

const STATUSES: QRTokenStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "ACTIVATED",
  "VOIDED",
  "REPLACED",
]

const statusStyles: Record<string, string> = {
  AVAILABLE:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ASSIGNED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ACTIVATED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  VOIDED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  REPLACED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
}

const PAGE_SIZE = 100

export default async function QrTokensPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    batch?: string
    q?: string
    page?: string
  }>
}) {
  await requireRole("ADMIN")
  const sp = await searchParams

  const where: Prisma.QRTokenWhereInput = {}
  if (sp.status && STATUSES.includes(sp.status as QRTokenStatus)) {
    where.status = sp.status as QRTokenStatus
  }
  if (sp.batch) where.batchId = sp.batch
  if (sp.q) where.token = { contains: sp.q.toUpperCase() }

  const page = Math.max(1, Number(sp.page) || 1)

  const [tokens, totalCount, batches] = await Promise.all([
    prisma.qRToken.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { batch: { select: { batchName: true } } },
    }),
    prisma.qRToken.count({ where }),
    prisma.qRTokenBatch.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, batchName: true, createdAt: true },
      take: 100,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const exportQs = new URLSearchParams()
  if (sp.status) exportQs.set("status", sp.status)
  if (sp.batch) exportQs.set("batch", sp.batch)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            QR Tokens
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {totalCount} token{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/admin/qr-tokens/export?${exportQs.toString()}`}>
              Export CSV
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/qr-tokens/import">Import</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/qr-tokens/generate">Generate</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search token…"
          className="h-8 w-48 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="batch"
          defaultValue={sp.batch ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batchName ?? b.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(sp.q || sp.status || sp.batch) && (
          <Button variant="ghost" asChild>
            <Link href="/admin/qr-tokens">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {tokens.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No tokens found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Token
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Batch
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-50">
                    {t.token}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
                        (statusStyles[t.status] ?? "")
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {t.batch?.batchName ?? (t.batchId ? t.batchId.slice(0, 8) : "—")}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {t.createdAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(t.status === "AVAILABLE" || t.status === "ASSIGNED") && (
                      <VoidTokenButton id={t.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/qr-tokens?${new URLSearchParams({
                    ...(sp.q ? { q: sp.q } : {}),
                    ...(sp.status ? { status: sp.status } : {}),
                    ...(sp.batch ? { batch: sp.batch } : {}),
                    page: String(page - 1),
                  }).toString()}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/admin/qr-tokens?${new URLSearchParams({
                    ...(sp.q ? { q: sp.q } : {}),
                    ...(sp.status ? { status: sp.status } : {}),
                    ...(sp.batch ? { batch: sp.batch } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
