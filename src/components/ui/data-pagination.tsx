"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  CATALOG_PAGE_SIZES,
  getPaginationRange,
  type PaginationResult,
} from "@/lib/pagination"

interface DataPaginationProps extends Pick<
  PaginationResult,
  "page" | "pageSize" | "totalPages" | "from" | "to" | "totalCount"
> {
  pageSizes?: readonly number[]
}

/**
 * Reusable URL-driven pagination footer for admin catalog tables.
 *
 * Preserves all existing query params (search + filters) when navigating.
 * Changing the page size resets to page 1. Page links are real anchors so
 * browser Back/Forward restores both the URL and the visible controls.
 */
export function DataPagination({
  page,
  pageSize,
  totalPages,
  from,
  to,
  totalCount,
  pageSizes = CATALOG_PAGE_SIZES,
}: DataPaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(overrides)) {
      params.set(key, value)
    }
    return `${pathname}?${params.toString()}`
  }

  function handleSizeChange(value: string) {
    startTransition(() => {
      // Page size change resets to page 1.
      router.push(buildUrl({ pageSize: value, page: "1" }))
    })
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <span>
          Showing {from}–{to} of {totalCount}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={handleSizeChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-20 text-xs" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              {page > 1 ? (
                <PaginationPrevious href={buildUrl({ page: String(page - 1) })} />
              ) : (
                <Button
                  variant="ghost"
                  size="default"
                  disabled
                  className="cursor-not-allowed pl-1.5! opacity-50"
                >
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
                    href={buildUrl({ page: String(p) })}
                    isActive={p === page}
                  >
                    {p}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              {page < totalPages ? (
                <PaginationNext href={buildUrl({ page: String(page + 1) })} />
              ) : (
                <Button
                  variant="ghost"
                  size="default"
                  disabled
                  className="cursor-not-allowed pr-1.5! opacity-50"
                >
                  Next
                </Button>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
