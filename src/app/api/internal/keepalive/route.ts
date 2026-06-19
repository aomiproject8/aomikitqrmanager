import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkKeepaliveKey, KEEPALIVE_NO_STORE } from "@/lib/keepalive"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const denied = checkKeepaliveKey(req)
  if (denied) return denied

  try {
    // Harmless read-only ping. Never returns row data.
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true }, { status: 200, headers: KEEPALIVE_NO_STORE })
  } catch {
    // Generic — no schema/host/credentials/stack leakage.
    return NextResponse.json(
      { ok: false, error: "Database unavailable" },
      { status: 503, headers: KEEPALIVE_NO_STORE }
    )
  }
}
