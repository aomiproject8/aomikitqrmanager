import { NextResponse, type NextRequest } from "next/server"

/**
 * Validate the `x-api-key` header against MOBILE_API_KEY.
 * Returns an error NextResponse when invalid, or null when authorized.
 */
export function checkMobileApiKey(req: NextRequest): NextResponse | null {
  const expected = process.env.MOBILE_API_KEY
  if (!expected) {
    return NextResponse.json(
      { error: "Mobile API is not configured" },
      { status: 503 }
    )
  }
  const provided = req.headers.get("x-api-key")
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
