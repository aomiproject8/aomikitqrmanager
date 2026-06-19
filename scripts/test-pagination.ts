/**
 * Regression tests for shared catalog pagination logic and page wiring.
 *
 * Pure-logic coverage (resolvePagination / resolvePageSize / getPaginationRange):
 *   A – first page offsets
 *   B – middle page offsets
 *   C – last page offsets
 *   D – excessive page clamps to last page
 *   E – invalid/<1/NaN page clamps to 1
 *   F – empty result set → page 1, from/to = 0
 *   G – partial last page row range
 *   H – page size resolution (allowed sizes + fallback)
 *   I – page-number range with ellipses
 *
 * Source-wiring coverage (each of the four catalog pages):
 *   J – uses count + resolvePagination + skip + take
 *   K – deterministic ordering (id tiebreaker in orderBy)
 *   L – renders DataPagination and preserves pageSize via hidden input
 *
 * Run:  npm run test:pagination
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import {
  resolvePagination,
  resolvePageSize,
  getPaginationRange,
  CATALOG_PAGE_SIZES,
  DEFAULT_CATALOG_PAGE_SIZE,
} from "../src/lib/pagination"

const projectRoot = resolve(__dirname, "..")
let exitCode = 0

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`)
    exitCode = 1
  } else {
    console.log(`  ✅ PASS: ${message}`)
  }
}

function eq<T>(a: T, b: T, label: string) {
  assert(a === b, `${label} (expected ${String(b)}, got ${String(a)})`)
}

console.log("\n── Pure pagination logic ──")

// A – first page
{
  const r = resolvePagination({ page: 1, pageSize: 25, totalCount: 100 })
  eq(r.page, 1, "A – page is 1")
  eq(r.skip, 0, "A – skip is 0")
  eq(r.take, 25, "A – take is 25")
  eq(r.from, 1, "A – from is 1")
  eq(r.to, 25, "A – to is 25")
  eq(r.totalPages, 4, "A – totalPages is 4")
}

// B – middle page
{
  const r = resolvePagination({ page: 2, pageSize: 25, totalCount: 100 })
  eq(r.skip, 25, "B – skip is 25")
  eq(r.from, 26, "B – from is 26")
  eq(r.to, 50, "B – to is 50")
}

// C – last page
{
  const r = resolvePagination({ page: 4, pageSize: 25, totalCount: 100 })
  eq(r.skip, 75, "C – skip is 75")
  eq(r.from, 76, "C – from is 76")
  eq(r.to, 100, "C – to is 100")
}

// D – excessive page clamps to last
{
  const r = resolvePagination({ page: 99, pageSize: 25, totalCount: 100 })
  eq(r.page, 4, "D – excessive page clamps to 4")
  eq(r.to, 100, "D – to clamps to 100")
}

// E – invalid pages clamp to 1
for (const bad of [0, -5, NaN, "abc", undefined]) {
  const r = resolvePagination({ page: bad as never, pageSize: 25, totalCount: 100 })
  eq(r.page, 1, `E – page=${String(bad)} clamps to 1`)
}

// F – empty result set
{
  const r = resolvePagination({ page: 3, pageSize: 25, totalCount: 0 })
  eq(r.page, 1, "F – empty set clamps page to 1")
  eq(r.from, 0, "F – empty set from is 0")
  eq(r.to, 0, "F – empty set to is 0")
  eq(r.totalPages, 1, "F – empty set totalPages is 1")
  eq(r.skip, 0, "F – empty set skip is 0")
}

// G – partial last page
{
  const r = resolvePagination({ page: 2, pageSize: 25, totalCount: 30 })
  eq(r.from, 26, "G – partial last page from is 26")
  eq(r.to, 30, "G – partial last page to is 30")
  eq(r.totalPages, 2, "G – partial last page totalPages is 2")
}

// H – page size resolution
{
  eq(resolvePageSize("25"), 25, "H – '25' → 25")
  eq(resolvePageSize("50"), 50, "H – '50' → 50")
  eq(resolvePageSize("100"), 100, "H – '100' → 100")
  eq(resolvePageSize("10"), DEFAULT_CATALOG_PAGE_SIZE, "H – disallowed '10' → default")
  eq(resolvePageSize("999"), DEFAULT_CATALOG_PAGE_SIZE, "H – disallowed '999' → default")
  eq(resolvePageSize(undefined), DEFAULT_CATALOG_PAGE_SIZE, "H – undefined → default")
  eq(resolvePageSize("abc"), DEFAULT_CATALOG_PAGE_SIZE, "H – non-numeric → default")
  assert(
    CATALOG_PAGE_SIZES.length === 3 &&
      CATALOG_PAGE_SIZES[0] === 25 &&
      CATALOG_PAGE_SIZES[2] === 100,
    "H – allowed sizes are [25, 50, 100]"
  )
  // changing page size resets offsets correctly
  const r = resolvePagination({ page: 1, pageSize: 50, totalCount: 100 })
  eq(r.take, 50, "H – pageSize change to 50 sets take=50")
  eq(r.totalPages, 2, "H – pageSize 50 over 100 rows → 2 pages")
}

// I – page-number range with ellipses
{
  const small = getPaginationRange(1, 3)
  assert(JSON.stringify(small) === JSON.stringify([1, 2, 3]), "I – small range is [1,2,3]")
  const wideStart = getPaginationRange(1, 20)
  assert(
    JSON.stringify(wideStart) === JSON.stringify([1, 2, "...", 20]),
    "I – range at start collapses tail"
  )
  const wideMid = getPaginationRange(10, 20)
  assert(
    JSON.stringify(wideMid) === JSON.stringify([1, "...", 9, 10, 11, "...", 20]),
    "I – range in middle has both ellipses"
  )
  const wideEnd = getPaginationRange(20, 20)
  assert(
    JSON.stringify(wideEnd) === JSON.stringify([1, "...", 19, 20]),
    "I – range at end collapses head"
  )
}

console.log("\n── Catalog page wiring ──")

const pages: { label: string; path: string; model: string }[] = [
  {
    label: "products",
    path: "src/app/(admin)/admin/products/page.tsx",
    model: "prisma.product.count",
  },
  {
    label: "diagnoses",
    path: "src/app/(admin)/admin/diagnoses/page.tsx",
    model: "prisma.diagnosis.count",
  },
  {
    label: "routine-types",
    path: "src/app/(admin)/admin/routine-types/page.tsx",
    model: "prisma.routineType.count",
  },
  {
    label: "routines",
    path: "src/app/(admin)/admin/routines/page.tsx",
    model: "prisma.routineTemplate.count",
  },
]

for (const p of pages) {
  const src = readFileSync(resolve(projectRoot, p.path), "utf-8")

  // J – count + resolvePagination + skip + take (no in-memory slicing)
  assert(src.includes(p.model), `J – ${p.label} uses ${p.model}`)
  assert(
    src.includes("resolvePagination"),
    `J – ${p.label} uses resolvePagination`
  )
  assert(src.includes("skip,") && src.includes("take,"), `J – ${p.label} passes skip/take`)

  // K – deterministic ordering with id tiebreaker
  assert(
    /orderBy:\s*\[[\s\S]*\{\s*id:\s*"asc"\s*\}[\s\S]*\]/.test(src),
    `K – ${p.label} has a deterministic id tiebreaker in orderBy`
  )

  // L – renders DataPagination and preserves pageSize via hidden input
  assert(src.includes("<DataPagination"), `L – ${p.label} renders DataPagination`)
  assert(
    src.includes('name="pageSize"') && src.includes("value={pageSize}"),
    `L – ${p.label} preserves pageSize via a hidden form input`
  )
}

console.log("\n─────────────────────────────────")
if (exitCode === 0) {
  console.log("All pagination tests passed ✅")
} else {
  console.log("Some pagination tests FAILED ❌")
}
process.exit(exitCode)
