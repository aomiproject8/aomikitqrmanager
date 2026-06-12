import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { updateRoutine, toggleRoutineActive } from "../actions"
import RoutineForm from "../_components/routine-form"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const routine = await prisma.routineTemplate.findUnique({
    where: { id },
    select: { name: true },
  })
  return { title: routine ? `${routine.name} — AOMI Kit Admin` : "Routine" }
}

export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole("ADMIN")
  const { id } = await params

  const routine = await prisma.routineTemplate.findUnique({
    where: { id },
    include: {
      diagnoses: { select: { diagnosisId: true } },
      steps: { orderBy: { stepNumber: "asc" } },
    },
  })
  if (!routine) notFound()

  const [routineTypes, diagnoses, products] = await Promise.all([
    prisma.routineType.findMany({
      where: { OR: [{ active: true }, { id: routine.routineTypeId }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.diagnosis.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
    prisma.product.findMany({
      where: { active: true },
      orderBy: [{ stepType: "asc" }, { name: "asc" }],
      select: { id: true, name: true, stepType: true },
    }),
  ])

  // Include any selected (possibly inactive) diagnoses in the list so they
  // stay visible/selected.
  const selectedIds = new Set(routine.diagnoses.map((d) => d.diagnosisId))
  const diagnosisOptions = diagnoses
    .filter((d) => d.active || selectedIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name }))

  const action = updateRoutine.bind(null, id)

  const defaults = {
    name: routine.name,
    description: routine.description,
    routineTypeId: routine.routineTypeId,
    durationDays: routine.durationDays,
    generalInstructions: routine.generalInstructions,
    active: routine.active,
    diagnosisIds: routine.diagnoses.map((d) => d.diagnosisId),
    steps: routine.steps.map((s) => ({
      stepType: s.stepType,
      defaultProductId: s.defaultProductId,
      instruction: s.instruction,
    })),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/routines" className="hover:underline">
              Routines
            </Link>
            {" / "}
            <span>{routine.name}</span>
          </nav>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {routine.name}
          </h1>
        </div>
        <form action={toggleRoutineActive}>
          <input type="hidden" name="id" value={routine.id} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className={
              routine.active
                ? "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950"
                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900 dark:hover:bg-emerald-950"
            }
          >
            {routine.active ? "Deactivate" : "Activate"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <RoutineForm
          action={action}
          routineTypes={routineTypes}
          diagnoses={diagnosisOptions}
          products={products}
          defaults={defaults}
          submitLabel="Save changes"
        />
      </div>
    </div>
  )
}
