/**
 * Pure parser for scanned/typed QR payloads. No DOM, no dependencies beyond the
 * shared token helpers — safe to unit-test and to run in the browser.
 *
 * AOMI QR codes encode the raw token (`PREFIX-XXXXXX`, e.g. `AOMI-KIT-7F3K9Q`).
 * The only token-bearing AOMI URL shape is the mobile lookup path `/api/qr/<token>`.
 * To avoid trusting arbitrary external URLs, a URL payload is accepted ONLY when
 * its path is exactly that shape; everything else is rejected. The extracted
 * token is always re-validated, and the server remains the authoritative check.
 */

import { normalizeToken, isValidTokenFormat } from "./token"

/** Reject pathologically long payloads before any work. */
export const MAX_QR_PAYLOAD_LENGTH = 512

const AOMI_QR_PATH_PREFIX = "/api/qr/"

export type QrParseFailure =
  | "empty"
  | "too_long"
  | "invalid_url"
  | "external"
  | "no_token"
  | "invalid_token"

export type QrParseResult =
  | { ok: true; token: string }
  | { ok: false; reason: QrParseFailure }

/**
 * Parse a raw scan/typed value into a normalized AOMI token.
 *
 * Accepts:
 *  - a raw token string (whitespace tolerated, case-normalized)
 *  - an AOMI URL of the form `https?://<host>/api/qr/<token>`
 *
 * Rejects empty input, over-long input, malformed URLs, URLs that are not the
 * AOMI `/api/qr/` shape (including external domains), and anything that fails
 * token-format validation.
 */
export function parseQrPayload(raw: string | null | undefined): QrParseResult {
  if (raw == null) return { ok: false, reason: "empty" }
  const trimmed = raw.trim()
  if (!trimmed) return { ok: false, reason: "empty" }
  if (trimmed.length > MAX_QR_PAYLOAD_LENGTH) {
    return { ok: false, reason: "too_long" }
  }

  // URL form — only the AOMI mobile-lookup path is trusted.
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL
    try {
      url = new URL(trimmed)
    } catch {
      return { ok: false, reason: "invalid_url" }
    }

    if (!url.pathname.startsWith(AOMI_QR_PATH_PREFIX)) {
      return { ok: false, reason: "external" }
    }

    const rest = url.pathname.slice(AOMI_QR_PATH_PREFIX.length).replace(/\/+$/, "")
    if (!rest) return { ok: false, reason: "no_token" }

    let decoded: string
    try {
      decoded = decodeURIComponent(rest)
    } catch {
      return { ok: false, reason: "invalid_url" }
    }

    const normalized = normalizeToken(decoded)
    if (!isValidTokenFormat(normalized)) {
      return { ok: false, reason: "invalid_token" }
    }
    return { ok: true, token: normalized }
  }

  // Raw token form.
  const normalized = normalizeToken(trimmed)
  if (!isValidTokenFormat(normalized)) {
    return { ok: false, reason: "invalid_token" }
  }
  return { ok: true, token: normalized }
}
