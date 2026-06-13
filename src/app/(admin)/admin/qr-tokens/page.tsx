import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import VoidTokenButton from "./_components/void-token-button"
import type { Prisma, QRTokenStatus } from "@/generated/prisma/client"
import {
  Plus,
  Download,
  Eye,
  Activity,
  FileSpreadsheet,
  Layers,
  CheckCircle,
  HelpCircle,
  FileText,
  QrCode,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { AdminFormSheet } from "@/components/ui/admin-form-sheet"
import { SheetFooter } from "@/components/ui/sheet"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import GenerateForm from "./generate/_generate-form"
import ImportForm from "./import/_import-form"
import { PageSizeSelector } from "./_components/page-size-selector"
import { QrTokenFilters } from "./_components/qr-token-filters"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

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
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/50",
  ASSIGNED:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/50",
  ACTIVATED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/50",
  VOIDED:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-850 dark:text-zinc-400 border-zinc-200/50",
  REPLACED:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200/50",
}

function getPaginationRange(current: number, total: number) {
  const pages: (number | string)[] = []
  const showMax = 5
  if (total <= showMax) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) {
      pages.push("...")
    }
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    if (current < total - 2) {
      pages.push("...")
    }
    pages.push(total)
  }
  return pages
}

export default async function QrTokensPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    batch?: string
    q?: string
    page?: string
    pageSize?: string
    generate?: string
    import?: string
    tokenDetails?: string
  }>
}) {
  await requireRole("ADMIN")
  const sp = await searchParams

  // Setup filters
  const where: Prisma.QRTokenWhereInput = {}
  if (sp.status && STATUSES.includes(sp.status as QRTokenStatus)) {
    where.status = sp.status as QRTokenStatus
  }
  if (sp.batch) where.batchId = sp.batch
  if (sp.q) where.token = { contains: sp.q.toUpperCase() }

  // Clamp rows per page selector values
  const allowedSizes = [50, 100, 500, 1000]
  const pageSize = allowedSizes.includes(Number(sp.pageSize))
    ? Number(sp.pageSize)
    : 50

  // Total count query for clamping page parameter
  const totalCount = await prisma.qRToken.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Clamp page value
  let page = Math.max(1, Number(sp.page) || 1)
  if (page > totalPages) {
    page = totalPages
  }

  // Fetch list, batches, stats, and detailed token (if selected)
  const [tokens, batches, statsGroup, detailedToken] = await Promise.all([
    prisma.qRToken.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        token: true,
        status: true,
        batchId: true,
        createdAt: true,
        batch: {
          select: {
            batchName: true,
          },
        },
      },
    }),
    prisma.qRTokenBatch.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, batchName: true, createdAt: true },
      take: 100,
    }),
    prisma.qRToken.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    sp.tokenDetails
      ? prisma.qRToken.findUnique({
          where: { id: sp.tokenDetails },
          include: {
            batch: true,
            package: {
              include: {
                template: {
                  select: { name: true },
                },
              },
            },
            events: {
              orderBy: { createdAt: "desc" },
            },
          },
        })
      : null,
  ])

  // Process statistics mapping
  const stats = {
    AVAILABLE: 0,
    ASSIGNED: 0,
    ACTIVATED: 0,
    VOIDED: 0,
    REPLACED: 0,
    TOTAL: 0,
  }
  let computedTotal = 0
  for (const g of statsGroup) {
    const status = g.status as keyof typeof stats
    const count = g._count._all
    if (status in stats) {
      stats[status] = count
      computedTotal += count
    }
  }
  stats.TOTAL = computedTotal

  // Determine Primary Card text
  let primaryCardTitle = "Total QR Codes"
  let primaryCardSubtitle = ""
  
  const activeBatchName = sp.batch ? (batches.find(b => b.id === sp.batch)?.batchName ?? sp.batch.slice(0, 8)) : ""

  if (sp.q) {
    primaryCardTitle = "Matching QR Codes"
    primaryCardSubtitle = "Filtered by active search" + (sp.batch ? ` in ${activeBatchName}` : "")
  } else if (sp.batch && sp.status) {
    primaryCardTitle = "Matching QR Codes"
    primaryCardSubtitle = `${sp.status} in ${activeBatchName}`
  } else if (sp.batch) {
    primaryCardTitle = "QR Codes in Batch"
    primaryCardSubtitle = activeBatchName
  } else if (sp.status) {
    const capitalizedStatus = sp.status.charAt(0).toUpperCase() + sp.status.slice(1).toLowerCase()
    primaryCardTitle = `${capitalizedStatus} QR Codes`
  }

  // Build pagination links builder
  const getPageUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (sp.q) params.set("q", sp.q)
    if (sp.status) params.set("status", sp.status)
    if (sp.batch) params.set("batch", sp.batch)
    params.set("pageSize", String(pageSize))
    params.set("page", String(targetPage))
    return `/admin/qr-tokens?${params.toString()}`
  }

  // Build export query string
  const exportQs = new URLSearchParams()
  if (sp.status) exportQs.set("status", sp.status)
  if (sp.batch) exportQs.set("batch", sp.batch)

  const isGenerateSheetOpen = sp.generate === "true"
  const isImportSheetOpen = sp.import === "true"
  const isDetailsSheetOpen = !!sp.tokenDetails

  // Re-build query parameters for Sheet close actions (maintains page and filters)
  const sheetCloseQs = new URLSearchParams()
  if (sp.q) sheetCloseQs.set("q", sp.q)
  if (sp.status) sheetCloseQs.set("status", sp.status)
  if (sp.batch) sheetCloseQs.set("batch", sp.batch)
  sheetCloseQs.set("page", String(page))
  sheetCloseQs.set("pageSize", String(pageSize))
  const sheetCloseUrl = `/admin/qr-tokens?${sheetCloseQs.toString()}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR Tokens"
        description="Manage product tokens, import logs, and activation lifecycles"
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/admin/qr-tokens/export?${exportQs.toString()}`}>
                <Download className="mr-2 size-4" /> Export CSV
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/qr-tokens?import=true&${sheetCloseQs.toString()}`}>
                <FileSpreadsheet className="mr-2 size-4" /> Import
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/admin/qr-tokens?generate=true&${sheetCloseQs.toString()}`}>
                <Plus className="mr-2 size-4" /> Generate
              </Link>
            </Button>
          </div>
        }
      />

      {/* Prominent Statistics Grid — always visible above filter controls */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1 flex-1 pr-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{primaryCardTitle}</span>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{totalCount}</p>
              {primaryCardSubtitle && (
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 truncate" title={primaryCardSubtitle}>{primaryCardSubtitle}</p>
              )}
            </div>
            <Layers className="size-6 text-zinc-400 shrink-0 mt-1" />
          </CardContent>
        </Card>

        <Card className="border-blue-200/60 bg-blue-50/20 dark:border-blue-900/50 dark:bg-blue-950/10 shadow-sm">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-blue-600/80 dark:text-blue-400 uppercase tracking-wide">Available</span>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.AVAILABLE}</p>
              <p className="text-[10px] text-blue-500/70 dark:text-blue-400/80 uppercase tracking-wider mt-1">Across all batches</p>
            </div>
            <HelpCircle className="size-6 text-blue-400 shrink-0 mt-1" />
          </CardContent>
        </Card>

        <Card className="border-amber-200/60 bg-amber-50/20 dark:border-amber-900/50 dark:bg-amber-950/10 shadow-sm">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-600/80 dark:text-amber-400 uppercase tracking-wide">Assigned</span>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.ASSIGNED}</p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wider mt-1">Across all batches</p>
            </div>
            <FileText className="size-6 text-amber-400 shrink-0 mt-1" />
          </CardContent>
        </Card>

        <Card className="border-emerald-200/60 bg-emerald-50/20 dark:border-emerald-900/50 dark:bg-emerald-950/10 shadow-sm">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400 uppercase tracking-wide">Activated</span>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.ACTIVATED}</p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-wider mt-1">Across all batches</p>
            </div>
            <CheckCircle className="size-6 text-emerald-400 shrink-0 mt-1" />
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-4 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Voided</span>
              <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{stats.VOIDED}</p>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1">Across all batches</p>
            </div>
            <Activity className="size-6 text-zinc-400 shrink-0 mt-1" />
          </CardContent>
        </Card>
      </div>

      <QrTokenFilters key={sp.q ?? ""} batches={batches} statuses={STATUSES}>

        {/* Table / Empty state */}
        {tokens.length === 0 ? (
          (sp.q || sp.status || sp.batch) ? (
            <EmptyState
              icon={QrCode}
              title="No tokens found"
              description="No QR tokens matched your active search or filter inputs."
              action={
                <Button variant="outline" asChild>
                  <Link href="/admin/qr-tokens">Clear Filters</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={QrCode}
              title="No tokens generated yet"
              description="Generate a new batch of codes or import pre-existing codes to get started."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/admin/qr-tokens?import=true&${sheetCloseQs.toString()}`}>
                      <FileSpreadsheet className="mr-2 size-4" /> Import Tokens
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/admin/qr-tokens?generate=true&${sheetCloseQs.toString()}`}>
                      <Plus className="mr-2 size-4" /> Generate Tokens
                    </Link>
                  </Button>
                </div>
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
                      Token
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Batch
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                        <Link
                          href={`/admin/qr-tokens?tokenDetails=${t.id}&${sheetCloseQs.toString()}`}
                          className="hover:underline cursor-pointer"
                        >
                          {t.token}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border " +
                            (statusStyles[t.status] ?? "")
                          }
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {t.batch?.batchName ?? (t.batchId ? t.batchId.slice(0, 8) : "—")}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {t.createdAt.toISOString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/admin/qr-tokens?tokenDetails=${t.id}&${sheetCloseQs.toString()}`}
                                aria-label="View Token Details"
                                className={buttonVariants({ variant: "ghost", size: "icon" })}
                              >
                                <Eye className="size-4" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Token Details</TooltipContent>
                          </Tooltip>

                          {(t.status === "AVAILABLE" || t.status === "ASSIGNED") && (
                            <VoidTokenButton id={t.id} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-zinc-500">
          <div className="flex items-center gap-4">
            <span>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <PageSizeSelector currentSize={pageSize} />
          </div>

          {totalPages > 1 && (
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  {page > 1 ? (
                    <PaginationPrevious href={getPageUrl(page - 1)} />
                  ) : (
                    <Button variant="ghost" size="default" disabled className="pl-1.5! opacity-50 cursor-not-allowed">
                      Previous
                    </Button>
                  )}
                </PaginationItem>

                {getPaginationRange(page, totalPages).map((p, index) => (
                  <PaginationItem key={index}>
                    {p === "..." ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href={getPageUrl(Number(p))}
                        isActive={p === page}
                      >
                        {p}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  {page < totalPages ? (
                    <PaginationNext href={getPageUrl(page + 1)} />
                  ) : (
                    <Button variant="ghost" size="default" disabled className="pr-1.5! opacity-50 cursor-not-allowed">
                      Next
                    </Button>
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </QrTokenFilters>

      {/* Generate Tokens Sheet */}
      <AdminFormSheet
        open={isGenerateSheetOpen}
        title="Generate Token Batch"
        description="Creates a new batch of AVAILABLE codes with the specified quantity and prefix."
        closeUrl={sheetCloseUrl}
        className="w-full sm:max-w-lg"
      >
        <GenerateForm key={isGenerateSheetOpen ? "generate-open" : "generate-closed"} />
      </AdminFormSheet>

      {/* Import Tokens Sheet */}
      <AdminFormSheet
        open={isImportSheetOpen}
        title="Import Tokens"
        description="Provide a CSV file or paste token codes directly. Duplicates and invalid formats will be ignored."
        closeUrl={sheetCloseUrl}
        className="w-full sm:max-w-lg"
      >
        <ImportForm key={isImportSheetOpen ? "import-open" : "import-closed"} />
      </AdminFormSheet>

      {/* Token Details Sheet */}
      <AdminFormSheet
        open={isDetailsSheetOpen}
        title="Token Detailed Info"
        description="Audit trace and state indicators for this token."
        closeUrl={sheetCloseUrl}
        className="w-full sm:max-w-2xl lg:max-w-3xl"
      >
        {detailedToken && (
          <div className="flex flex-1 flex-col min-h-0">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Token Code Header */}
              <div className="rounded-lg border bg-zinc-50/50 p-4 dark:bg-zinc-900/50 space-y-1">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Token Code</span>
                <div className="font-mono text-xl font-bold tracking-wider text-zinc-900 dark:text-zinc-50 select-all p-3 bg-white dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800">
                  {detailedToken.token}
                </div>
              </div>

              {/* Status & Created Date grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lifecycle Status</span>
                  <div className="pt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusStyles[detailedToken.status]}`}>
                      {detailedToken.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Created At</span>
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {new Date(detailedToken.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>

              {/* Batch Origin details Card */}
              <div className="rounded-lg border p-4 space-y-3 bg-card text-card-foreground">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b pb-1 dark:border-zinc-800">Batch Origin</h4>
                {detailedToken.batch ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Batch Name</dt>
                      <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{detailedToken.batch.batchName ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Prefix</dt>
                      <dd className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{detailedToken.batch.prefix}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Source</dt>
                      <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{detailedToken.batch.source}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Batch ID</dt>
                      <dd className="font-mono text-xs text-zinc-450 dark:text-zinc-400 truncate mt-0.5" title={detailedToken.batch.id}>{detailedToken.batch.id}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Independent token (no batch origin).</p>
                )}
              </div>

              {/* Package assignment details Card */}
              <div className="rounded-lg border p-4 space-y-3 bg-card text-card-foreground">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b pb-1 dark:border-zinc-800">Routine Assignment</h4>
                {detailedToken.package ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <dt className="text-xs text-zinc-400 font-medium">Active Routine Template</dt>
                      <dd className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">{detailedToken.package.template?.name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Package Status</dt>
                      <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{detailedToken.package.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-zinc-400 font-medium">Assigned Date</dt>
                      <dd className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {new Date(detailedToken.package.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-xs text-zinc-500 italic">Not assigned yet.</p>
                )}
              </div>

              {/* Events Logs audit history */}
              <div className="rounded-lg border p-4 space-y-3 bg-card text-card-foreground">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b pb-1 dark:border-zinc-800">Audit Scan History</h4>
                {detailedToken.events && detailedToken.events.length > 0 ? (
                  <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                    {detailedToken.events.map((ev) => (
                      <div key={ev.id} className="text-xs p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded border border-zinc-100 dark:border-zinc-800 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-zinc-800 dark:text-zinc-100">{ev.eventType}</span>
                          <span className="text-zinc-400 text-[10px]">
                            {new Date(ev.createdAt).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        {ev.externalUserId && (
                          <p className="text-zinc-500 text-[11px]">External User: <span className="font-mono text-[10px] select-all bg-white dark:bg-zinc-950 px-1 py-0.5 rounded border">{ev.externalUserId}</span></p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic">No scans recorded.</p>
                )}
              </div>

              {/* Danger Zone */}
              {(detailedToken.status === "AVAILABLE" || detailedToken.status === "ASSIGNED") && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/10 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Danger Zone</h4>
                    <p className="text-xs text-red-600 dark:text-red-400">Voiding this token is permanent and cannot be undone. Associated packages will lose access.</p>
                  </div>
                  <VoidTokenButton id={detailedToken.id} variant="full" />
                </div>
              )}
            </div>

            <SheetFooter className="shrink-0 border-t bg-background px-6 py-4 flex items-center justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={sheetCloseUrl}>Close</Link>
              </Button>
            </SheetFooter>
          </div>
        )}
      </AdminFormSheet>
    </div>
  )
}
