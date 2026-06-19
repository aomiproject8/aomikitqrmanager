import "server-only"

import crypto from "crypto"
import { NextResponse } from "next/server"

const NO_STORE = { "Cache-Control": "no-store" } as const

/**
 * Validate the `x-keepalive-key` header against `SUPABASE_KEEPALIVE_KEY`.
 *
 * - 503 if the env var is not configured.
 * - 401 if the header is missing, the wrong length, or fails timing-safe compare.
 * - Returns null on success.
 * Never logs either key.
 */
export function checkKeepaliveKey(req: Request): NextResponse | null {
  const expected = process.env.SUPABASE_KEEPALIVE_KEY
  if (!expected || expected.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Keep-alive is not configured" },
      { status: 503, headers: NO_STORE }
    )
  }

  const provided = req.headers.get("x-keepalive-key")
  if (!provided) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    )
  }

  const expectedBuf = Buffer.from(expected, "utf8")
  const providedBuf = Buffer.from(provided, "utf8")
  if (expectedBuf.length !== providedBuf.length) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    )
  }

  if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: NO_STORE }
    )
  }

  return null
}

export const KEEPALIVE_NO_STORE = NO_STORE
