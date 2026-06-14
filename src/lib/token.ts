import { customAlphabet } from "nanoid"

// Unambiguous uppercase alphabet (no 0/O/1/I) for human-readable tokens.
export const TOKEN_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
export const TOKEN_RANDOM_SUFFIX_LENGTH = 6
const nano = customAlphabet(TOKEN_ALPHABET, TOKEN_RANDOM_SUFFIX_LENGTH)

export const DEFAULT_PREFIX = "AOMI-KIT"

/** Generate a single token, e.g. `AOMI-KIT-7F3K9Q`. */
export function generateToken(prefix: string = DEFAULT_PREFIX): string {
  return `${prefix}-${nano()}`
}

/**
 * Generate `count` unique tokens. Uniqueness is guaranteed within the batch;
 * callers must still guard against collisions with already-persisted tokens.
 */
export function generateTokens(
  count: number,
  prefix: string = DEFAULT_PREFIX
): string[] {
  const set = new Set<string>()
  // Cap attempts to avoid an infinite loop in the (astronomically unlikely)
  // event of repeated collisions.
  let attempts = 0
  const maxAttempts = count * 20 + 100
  while (set.size < count && attempts < maxAttempts) {
    set.add(generateToken(prefix))
    attempts += 1
  }
  return Array.from(set)
}

const TOKEN_RE = /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/

/** Normalize a raw token string (trim + uppercase). */
export function normalizeToken(raw: string): string {
  return raw.trim().toUpperCase()
}

/** Basic structural validation for an imported/scanned token. */
export function isValidTokenFormat(token: string): boolean {
  return token.length >= 4 && token.length <= 64 && TOKEN_RE.test(token)
}
