import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import AssignFlow from "./_components/assign-flow"

export const metadata = { title: "Assign QR Kit — AOMI Kit" }

export default async function AssignPage() {
  await requireAuth()

  const diagnoses = await prisma.diagnosis.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/seller" className="hover:underline">
            Seller
          </Link>
          {" / Assign Kit"}
        </nav>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Assign QR Kit
        </h1>
      </div>

      <AssignFlow diagnoses={diagnoses} />
    </div>
  )
}
