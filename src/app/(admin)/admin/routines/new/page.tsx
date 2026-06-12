import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { createRoutine } from "../actions"
import RoutineForm from "../_components/routine-form"

export const metadata = { title: "New Routine — AOMI Kit Admin" }

export default async function NewRoutinePage() {
  await requireRole("ADMIN")

  const [routineTypes, diagnoses, products] = await Promise.all([
    prisma.routineType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.diagnosis.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ stepType: "asc" }, { name: "asc" }],
      select: { id: true, name: true, stepType: true },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/routines" className="hover:underline">
            Routines
          </Link>
          {" / New"}
        </nav>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          New routine
        </h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <RoutineForm
          action={createRoutine}
          routineTypes={routineTypes}
          diagnoses={diagnoses}
          products={products}
          submitLabel="Create routine"
        />
      </div>
    </div>
  )
}
