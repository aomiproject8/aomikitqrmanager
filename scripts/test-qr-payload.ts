/**
 * Regression tests for the pure QR payload parser (scanner + manual entry).
 *
 * Coverage:
 *   A – raw token accepted and normalized
 *   B – whitespace tolerated
 *   C – lowercase normalized to uppercase
 *   D – valid AOMI URL (/api/qr/<token>) accepted
 *   E – malformed URL rejected
 *   F – external domain / non-AOMI path rejected
 *   G – AOMI URL missing token rejected
 *   H – empty / whitespace-only / null rejected
 *   I – over-long input rejected before parsing
 *   J – repeated scan is idempotent (same input → same token)
 *   K – garbage / invalid token format rejected
 *   L – wiring: assign-flow routes manual+USB+camera through parseQrPayload
 *   M – wiring: camera dialog stops all media tracks and feeds parseQrPayload
 *
 * Run:  npm run test:qr-payload
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import { parseQrPayload, MAX_QR_PAYLOAD_LENGTH } from "../src/lib/qr-payload"

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

console.log("\n── parseQrPayload ──")

// A – raw token
{
  const r = parseQrPayload("AOMI-KIT-ABC123")
  assert(r.ok && r.token === "AOMI-KIT-ABC123", "A – raw token accepted")
}

// B – whitespace tolerated
{
  const r = parseQrPayload("   AOMI-KIT-ABC123  ")
  assert(r.ok && r.token === "AOMI-KIT-ABC123", "B – surrounding whitespace trimmed")
}

// C – lowercase normalized
{
  const r = parseQrPayload("aomi-kit-abc123")
  assert(r.ok && r.token === "AOMI-KIT-ABC123", "C – lowercase normalized to uppercase")
}

// D – valid AOMI URL
{
  const r = parseQrPayload("https://app.example.com/api/qr/AOMI-KIT-ABC123")
  assert(r.ok && r.token === "AOMI-KIT-ABC123", "D – AOMI /api/qr/ URL accepted")
}

// D2 – AOMI URL with trailing slash + query
{
  const r = parseQrPayload("https://app.example.com/api/qr/AOMI-KIT-ABC123/?x=1")
  assert(r.ok && r.token === "AOMI-KIT-ABC123", "D – AOMI URL with trailing slash + query")
}

// E – malformed URL
{
  const r = parseQrPayload("https://")
  assert(!r.ok && r.reason === "invalid_url", "E – malformed URL rejected")
}

// F – external domain / non-AOMI path
{
  const r = parseQrPayload("https://evil.com/AOMI-KIT-ABC123")
  assert(!r.ok && r.reason === "external", "F – non-AOMI path rejected as external")
}
{
  const r = parseQrPayload("https://evil.com/redirect?to=AOMI-KIT-ABC123")
  assert(!r.ok && r.reason === "external", "F – arbitrary external URL rejected")
}

// G – AOMI URL missing token
{
  const r = parseQrPayload("https://app.example.com/api/qr/")
  assert(!r.ok && r.reason === "no_token", "G – AOMI URL with no token rejected")
}

// H – empty / null
{
  assert(!parseQrPayload("").ok, "H – empty string rejected")
  assert(!parseQrPayload("    ").ok, "H – whitespace-only rejected")
  assert(!parseQrPayload(null).ok, "H – null rejected")
  assert(!parseQrPayload(undefined).ok, "H – undefined rejected")
}

// I – over-long input
{
  const big = "A".repeat(MAX_QR_PAYLOAD_LENGTH + 1)
  const r = parseQrPayload(big)
  assert(!r.ok && r.reason === "too_long", "I – over-long input rejected")
}

// J – repeated scan idempotent
{
  const a = parseQrPayload("AOMI-KIT-ABC123")
  const b = parseQrPayload("AOMI-KIT-ABC123")
  assert(
    a.ok && b.ok && a.token === b.token,
    "J – repeated scan yields the same token"
  )
}

// K – garbage / invalid format
{
  assert(
    !parseQrPayload("not a token!!!").ok,
    "K – spaces/punctuation rejected as invalid token"
  )
  assert(!parseQrPayload("AB").ok, "K – too-short token rejected")
  assert(!parseQrPayload("NODASHES").ok, "K – token without a dash rejected")
}

console.log("\n── Scanner wiring ──")

const flowSrc = readFileSync(
  resolve(
    projectRoot,
    "src/app/(seller)/seller/assign/_components/assign-flow.tsx"
  ),
  "utf-8"
)
assert(
  flowSrc.includes("parseQrPayload") && flowSrc.includes("<QrScannerDialog"),
  "L – assign-flow uses parseQrPayload and renders the camera scanner"
)
assert(
  flowSrc.includes("if (pending) return"),
  "L – validate guards against duplicate simultaneous submissions"
)
assert(
  /USB or Bluetooth scanners/i.test(flowSrc),
  "L – USB keyboard-wedge guidance is shown to the seller"
)

const scannerSrc = readFileSync(
  resolve(
    projectRoot,
    "src/app/(seller)/seller/assign/_components/qr-scanner-dialog.tsx"
  ),
  "utf-8"
)
assert(
  scannerSrc.includes("getTracks()") && scannerSrc.includes("track.stop()"),
  "M – camera dialog stops every media track"
)
assert(
  scannerSrc.includes("facingMode") && scannerSrc.includes('"environment"'),
  "M – camera dialog prefers the rear camera"
)
assert(
  scannerSrc.includes("parseQrPayload") && scannerSrc.includes("lastTokenRef"),
  "M – camera dialog parses payloads and prevents repeat decodes"
)
assert(
  scannerSrc.includes("getUserMedia") &&
    scannerSrc.includes("BarcodeDetector") &&
    scannerSrc.includes("NotAllowedError"),
  "M – camera dialog handles secure-context, support, and permission cases"
)

console.log("\n─────────────────────────────────")
if (exitCode === 0) {
  console.log("All QR payload tests passed ✅")
} else {
  console.log("Some QR payload tests FAILED ❌")
}
process.exit(exitCode)
