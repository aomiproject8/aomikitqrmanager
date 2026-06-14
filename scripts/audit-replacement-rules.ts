/**
 * Dry-run audit of ProductReplacement records.
 *
 * Identifies rows where the rule's stepType does not match the source product's
 * stepType and/or the replacement product's stepType. These records are invalid
 * under the invariant enforced by addReplacementRule (server action).
 *
 * This script makes NO changes. It prints a report and exits non-zero if any
 * invalid records are found so it can be used as a CI gate.
 *
 * Run: npx tsx scripts/audit-replacement-rules.ts
 */

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { Pool } from "pg"

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Environment variable ${key} is not set`)
  return value
}

async function main() {
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const rules = await prisma.productReplacement.findMany({
      select: {
        id: true,
        stepType: true,
        source: { select: { id: true, name: true, stepType: true } },
        replacement: { select: { id: true, name: true, stepType: true } },
      },
      orderBy: { createdAt: "asc" },
    })

    console.log(`\nAudit: ${rules.length} ProductReplacement record(s)\n`)

    const invalid: typeof rules = []

    for (const rule of rules) {
      const sourceMatch = rule.source.stepType === rule.stepType
      const replacementMatch = rule.replacement.stepType === rule.stepType

      if (!sourceMatch || !replacementMatch) {
        invalid.push(rule)

        const issues: string[] = []
        if (!sourceMatch)
          issues.push(
            `source stepType=${rule.source.stepType} ≠ rule stepType=${rule.stepType}`
          )
        if (!replacementMatch)
          issues.push(
            `replacement stepType=${rule.replacement.stepType} ≠ rule stepType=${rule.stepType}`
          )

        console.log(`INVALID  id=${rule.id}`)
        console.log(`  source:      ${rule.source.name} (${rule.source.stepType})`)
        console.log(`  replacement: ${rule.replacement.name} (${rule.replacement.stepType})`)
        console.log(`  rule.stepType: ${rule.stepType}`)
        console.log(`  issues: ${issues.join("; ")}`)
        console.log()
      }
    }

    const validCount = rules.length - invalid.length
    console.log(`Summary: ${validCount} valid, ${invalid.length} invalid`)

    if (invalid.length > 0) {
      console.log(
        "\nTo fix: remove invalid rules via the admin UI " +
          "(Admin → Products → [product] → Replacement Rules → Remove)."
      )
      process.exit(1)
    } else {
      console.log("\nAll replacement rules are consistent. No action needed.")
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
