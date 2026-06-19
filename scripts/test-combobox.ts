/**
 * Regression tests for the seller searchable Combobox.
 *
 * Pure-logic coverage (filterComboboxOptions):
 *   A – empty query returns all options
 *   B – case-insensitive label match
 *   C – keyword match (slug / routine-type name)
 *   D – no match returns empty (drives the empty-results message)
 *   E – whitespace-only query returns all
 *   F – partial substring match
 *
 * Wiring coverage:
 *   G – assign-flow renders a diagnosis Combobox searchable by name + slug
 *   H – assign-flow renders a routine Combobox searchable by name + type
 *   I – diagnosis change resets routine/preview/selections downstream
 *   J – assign page selects diagnosis slug for client-side search
 *
 * Run:  npm run test:combobox
 */

import { readFileSync } from "fs"
import { resolve } from "path"
import {
  filterComboboxOptions,
  type ComboboxOption,
} from "../src/lib/combobox-filter"

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

const diagnoses: ComboboxOption[] = [
  { value: "1", label: "Acne", keywords: ["acne-mild"] },
  { value: "2", label: "Rosacea", keywords: ["rosacea"] },
  { value: "3", label: "Hyperpigmentation", keywords: ["dark-spots"] },
]

const routines: ComboboxOption[] = [
  { value: "r1", label: "Acne Recovery — Basic", keywords: ["Morning"] },
  { value: "r2", label: "Gentle Evening", keywords: ["Evening"] },
]

console.log("\n── filterComboboxOptions ──")

// A – empty query → all
assert(filterComboboxOptions(diagnoses, "").length === 3, "A – empty query returns all")

// B – case-insensitive label match
{
  const r = filterComboboxOptions(diagnoses, "ACNE")
  assert(r.length === 1 && r[0].value === "1", "B – case-insensitive label match")
}

// C – keyword (slug) match
{
  const r = filterComboboxOptions(diagnoses, "dark-spots")
  assert(r.length === 1 && r[0].value === "3", "C – keyword/slug match")
}

// C2 – routine type keyword match
{
  const r = filterComboboxOptions(routines, "evening")
  assert(r.length === 1 && r[0].value === "r2", "C – routine-type keyword match")
}

// D – no match → empty
assert(filterComboboxOptions(diagnoses, "zzz").length === 0, "D – no match returns empty")

// E – whitespace-only query → all
assert(filterComboboxOptions(diagnoses, "   ").length === 3, "E – whitespace query returns all")

// F – partial substring
{
  const r = filterComboboxOptions(diagnoses, "pigment")
  assert(r.length === 1 && r[0].value === "3", "F – partial substring match")
}

console.log("\n── Seller flow wiring ──")

const flowSrc = readFileSync(
  resolve(
    projectRoot,
    "src/app/(seller)/seller/assign/_components/assign-flow.tsx"
  ),
  "utf-8"
)

assert(
  flowSrc.includes("<Combobox") && flowSrc.includes('id="diagnosis"'),
  "G – diagnosis Combobox is rendered"
)
assert(
  flowSrc.includes("keywords: [d.slug]"),
  "G – diagnosis options are searchable by slug"
)
assert(
  flowSrc.includes('id="routine"'),
  "H – routine Combobox is rendered"
)
assert(
  flowSrc.includes("keywords: [r.routineTypeName]"),
  "H – routine options are searchable by routine-type name"
)
assert(
  /handleDiagnosisChange[\s\S]*setRoutineId\(null\)[\s\S]*setPreview\(null\)[\s\S]*setSelections\(\{\}\)/.test(
    flowSrc
  ),
  "I – diagnosis change resets routine, preview, and selections"
)

const pageSrc = readFileSync(
  resolve(projectRoot, "src/app/(seller)/seller/assign/page.tsx"),
  "utf-8"
)
assert(
  pageSrc.includes("slug: true"),
  "J – assign page selects diagnosis slug for search"
)

console.log("\n─────────────────────────────────")
if (exitCode === 0) {
  console.log("All combobox tests passed ✅")
} else {
  console.log("Some combobox tests FAILED ❌")
}
process.exit(exitCode)
