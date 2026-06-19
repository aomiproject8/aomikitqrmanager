/**
 * Shared, dependency-free pagination helpers for server-side catalog tables.
 *
 * Pure logic only (no React, no Prisma) so it can be unit-tested directly and
 * reused by every admin catalog page. Pages compute `count` then call
 * `resolvePagination` to clamp the requested page and derive `skip`/`take`.
 */

export const CATALOG_PAGE_SIZES = [25, 50, 100] as const
export type CatalogPageSize = (typeof CATALOG_PAGE_SIZES)[number]
export const DEFAULT_CATALOG_PAGE_SIZE: CatalogPageSize = 25

/** Resolve a raw `pageSize` query value to an allowed size, clamping to fallback. */
export function resolvePageSize(
  raw: string | number | undefined,
  allowed: readonly number[] = CATALOG_PAGE_SIZES,
  fallback: number = DEFAULT_CATALOG_PAGE_SIZE
): number {
  const n = Number(raw)
  return Number.isFinite(n) && allowed.includes(n) ? n : fallback
}

export interface PaginationResult {
  /** Clamped, 1-based current page. */
  page: number
  /** Resolved (allowed) page size. */
  pageSize: number
  /** Total number of pages (always >= 1). */
  totalPages: number
  /** Prisma `skip` for the current page. */
  skip: number
  /** Prisma `take` for the current page. */
  take: number
  /** 1-based index of the first row on the page (0 when empty). */
  from: number
  /** 1-based index of the last row on the page (0 when empty). */
  to: number
  /** Total matching rows (after filters). */
  totalCount: number
}

/**
 * Clamp the requested page against the total count and derive query offsets.
 *
 * - Invalid/NaN/<1 page → 1.
 * - page > last available page → last page.
 * - Empty result set → page 1, from/to = 0.
 */
export function resolvePagination(opts: {
  page: string | number | undefined
  pageSize: string | number | undefined
  totalCount: number
  allowedSizes?: readonly number[]
  defaultSize?: number
}): PaginationResult {
  const pageSize = resolvePageSize(
    opts.pageSize,
    opts.allowedSizes ?? CATALOG_PAGE_SIZES,
    opts.defaultSize ?? DEFAULT_CATALOG_PAGE_SIZE
  )
  const totalCount = Math.max(0, Math.floor(Number(opts.totalCount)) || 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  let page = Math.floor(Number(opts.page))
  if (!Number.isFinite(page) || page < 1) page = 1
  if (page > totalPages) page = totalPages

  const skip = (page - 1) * pageSize
  const take = pageSize
  const from = totalCount === 0 ? 0 : skip + 1
  const to = Math.min(page * pageSize, totalCount)

  return { page, pageSize, totalPages, skip, take, from, to, totalCount }
}

/**
 * Build a compact page-number range with ellipses, e.g. `[1, "...", 4, 5, 6, "...", 20]`.
 * Mirrors the QR-token table's range behavior so both surfaces look identical.
 */
export function getPaginationRange(
  current: number,
  total: number
): (number | string)[] {
  const pages: (number | string)[] = []
  const showMax = 5
  if (total <= showMax) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push("...")
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push("...")
    pages.push(total)
  }
  return pages
}
