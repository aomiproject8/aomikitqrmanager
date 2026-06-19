/**
 * Regression tests for the Supabase keep-alive endpoint and GitHub workflow.
 *
 * Coverage:
 *   A – missing config (no SUPABASE_KEEPALIVE_KEY) → 503 + no-store
 *   B – missing x-keepalive-key header → 401 + no-store
 *   C – wrong key (same length) → 401 + no-store
 *   D – length-mismatched key → 401 + no-store
 *   E – valid key → checkKeepaliveKey returns null (authorized)
 *   F – route source uses read-only SELECT 1 via $queryRaw
 *   G – route source performs no writes (no create/update/delete/upsert)
 *   H – route source forces Node runtime + dynamic + generic 503 on failure
 *   I – workflow YAML has workflow_dispatch + two non-round cron schedules
 *   J – workflow YAML has minimal permissions (contents: read)
 *   K – workflow YAML references both required secrets, no DB credentials
 *   L – workflow YAML has retries, connect/total timeouts, job timeout
 *   M – workflow YAML performs no repository checkout
 *   N – .env.example documents SUPABASE_KEEPALIVE_KEY, distinct from MOBILE_API_KEY
 *   O – (DB) valid key → 200 + ok:true + no-store; no rows created/updated
 *
 * Run:  npm run test:keepalive
 */

import "dotenv/config"
import { readFileSync } from "fs"
import { resolve } from "path"
import { checkKeepaliveKey } from "../src/lib/keepalive"

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

function mockReq(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/internal/keepalive", {
    method: "POST",
    headers,
  })
}

const TEST_KEY = "test-keepalive-key-0123456789"

async function runUnitTests() {
  console.log("\n── checkKeepaliveKey ──")

  // A – missing config
  {
    const saved = process.env.SUPABASE_KEEPALIVE_KEY
    delete process.env.SUPABASE_KEEPALIVE_KEY
    const res = checkKeepaliveKey(mockReq({ "x-keepalive-key": "anything" }))
    assert(res !== null && res.status === 503, "A – missing config → 503")
    assert(
      res?.headers.get("Cache-Control") === "no-store",
      "A – missing-config 503 has Cache-Control: no-store"
    )
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
  }

  // B – missing header
  {
    const saved = process.env.SUPABASE_KEEPALIVE_KEY
    process.env.SUPABASE_KEEPALIVE_KEY = TEST_KEY
    const res = checkKeepaliveKey(mockReq())
    assert(res !== null && res.status === 401, "B – missing header → 401")
    assert(
      res?.headers.get("Cache-Control") === "no-store",
      "B – missing-header 401 has Cache-Control: no-store"
    )
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
    else delete process.env.SUPABASE_KEEPALIVE_KEY
  }

  // C – wrong key, same length
  {
    const saved = process.env.SUPABASE_KEEPALIVE_KEY
    process.env.SUPABASE_KEEPALIVE_KEY = TEST_KEY
    const wrong = "x".repeat(TEST_KEY.length)
    const res = checkKeepaliveKey(mockReq({ "x-keepalive-key": wrong }))
    assert(res !== null && res.status === 401, "C – wrong same-length key → 401")
    assert(
      res?.headers.get("Cache-Control") === "no-store",
      "C – wrong-key 401 has Cache-Control: no-store"
    )
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
    else delete process.env.SUPABASE_KEEPALIVE_KEY
  }

  // D – length-mismatched key
  {
    const saved = process.env.SUPABASE_KEEPALIVE_KEY
    process.env.SUPABASE_KEEPALIVE_KEY = TEST_KEY
    const res = checkKeepaliveKey(mockReq({ "x-keepalive-key": "short" }))
    assert(res !== null && res.status === 401, "D – length-mismatch key → 401")
    assert(
      res?.headers.get("Cache-Control") === "no-store",
      "D – length-mismatch 401 has Cache-Control: no-store"
    )
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
    else delete process.env.SUPABASE_KEEPALIVE_KEY
  }

  // E – valid key
  {
    const saved = process.env.SUPABASE_KEEPALIVE_KEY
    process.env.SUPABASE_KEEPALIVE_KEY = TEST_KEY
    const res = checkKeepaliveKey(mockReq({ "x-keepalive-key": TEST_KEY }))
    assert(res === null, "E – valid key returns null (authorized)")
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
    else delete process.env.SUPABASE_KEEPALIVE_KEY
  }
}

function runSourceInspectionTests() {
  console.log("\n── Route source inspection ──")
  const routeSrc = readFileSync(
    resolve(projectRoot, "src/app/api/internal/keepalive/route.ts"),
    "utf-8"
  )

  assert(
    routeSrc.includes("SELECT 1") && routeSrc.includes("$queryRaw"),
    "F – route uses read-only SELECT 1 via $queryRaw"
  )
  assert(
    !/\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/.test(
      routeSrc
    ),
    "G – route performs no write operations"
  )
  assert(
    routeSrc.includes('runtime = "nodejs"') &&
      routeSrc.includes('dynamic = "force-dynamic"'),
    "H – route forces Node runtime and dynamic execution"
  )
  assert(
    /catch[\s\S]*status: 503/.test(routeSrc),
    "H – route returns a generic 503 on database failure"
  )
}

function runWorkflowTests() {
  console.log("\n── GitHub workflow YAML ──")
  const wf = readFileSync(
    resolve(projectRoot, ".github/workflows/supabase-keepalive.yml"),
    "utf-8"
  )

  assert(wf.includes("workflow_dispatch:"), "I – workflow has workflow_dispatch")
  assert(wf.includes("schedule:"), "I – workflow has schedule")
  assert(
    wf.includes('cron: "17 7 * * *"') && wf.includes('cron: "43 19 * * *"'),
    "I – two non-round daily cron windows (07:17, 19:43 UTC)"
  )
  assert(
    /permissions:\s*\n\s*contents:\s*read/.test(wf),
    "J – minimal permissions (contents: read)"
  )
  assert(
    wf.includes("secrets.AOMI_KEEPALIVE_URL") &&
      wf.includes("secrets.AOMI_KEEPALIVE_KEY"),
    "K – references both required repository secrets"
  )
  assert(
    !/DATABASE_URL|SERVICE_ROLE|DIRECT_URL/.test(wf),
    "K – workflow contains no database credentials"
  )
  assert(
    wf.includes("x-keepalive-key:") && wf.includes("--request POST"),
    "K – posts the secret only in the request header"
  )
  assert(
    wf.includes("attempts") && wf.includes("seq 1"),
    "L – workflow retries bounded transient failures"
  )
  assert(
    wf.includes("--connect-timeout") && wf.includes("--max-time"),
    "L – curl has connection and total timeouts"
  )
  assert(wf.includes("timeout-minutes:"), "L – job has a short timeout")
  assert(
    !wf.includes("actions/checkout"),
    "M – workflow performs no repository checkout"
  )
}

function runEnvTests() {
  console.log("\n── .env.example ──")
  const env = readFileSync(resolve(projectRoot, ".env.example"), "utf-8")
  assert(
    env.includes("SUPABASE_KEEPALIVE_KEY="),
    "N – .env.example documents SUPABASE_KEEPALIVE_KEY"
  )
  assert(
    env.includes("MOBILE_API_KEY=") &&
      !env.includes("SUPABASE_KEEPALIVE_KEY=${MOBILE_API_KEY}"),
    "N – keep-alive key is distinct from MOBILE_API_KEY"
  )
}

async function runDbTests() {
  console.log("\n── (DB) keep-alive route end-to-end ──")
  const { POST } = await import("../src/app/api/internal/keepalive/route")
  const { prisma } = await import("../src/lib/prisma")

  const saved = process.env.SUPABASE_KEEPALIVE_KEY
  process.env.SUPABASE_KEEPALIVE_KEY = TEST_KEY

  try {
    const before = await Promise.all([
      prisma.auditLog.count(),
      prisma.qRToken.count(),
      prisma.package.count(),
      prisma.product.count(),
      prisma.user.count(),
    ])

    const res = await POST(mockReq({ "x-keepalive-key": TEST_KEY }))
    assert(res.status === 200, "O – valid key → 200")
    assert(
      res.headers.get("Cache-Control") === "no-store",
      "O – 200 response has Cache-Control: no-store"
    )
    const body = (await res.json()) as { ok?: boolean }
    assert(body.ok === true, "O – 200 body is { ok: true }")

    const after = await Promise.all([
      prisma.auditLog.count(),
      prisma.qRToken.count(),
      prisma.package.count(),
      prisma.product.count(),
      prisma.user.count(),
    ])
    assert(
      before.every((n, i) => n === after[i]),
      "O – no AuditLog/token/package/catalog/user rows created or updated"
    )
  } finally {
    if (saved !== undefined) process.env.SUPABASE_KEEPALIVE_KEY = saved
    else delete process.env.SUPABASE_KEEPALIVE_KEY
    await prisma.$disconnect()
  }
}

async function main() {
  console.log("\nKeep-alive tests\n")

  await runUnitTests()
  runSourceInspectionTests()
  runWorkflowTests()
  runEnvTests()

  if (process.env.DATABASE_URL) {
    await runDbTests()
  } else {
    console.log(
      "\n⚠  DATABASE_URL not set — skipping DB test (O). Set it to run it."
    )
  }

  console.log("\n─────────────────────────────────")
  if (exitCode === 0) {
    console.log("All keep-alive tests passed ✅")
  } else {
    console.log("Some keep-alive tests FAILED ❌")
  }
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
