import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil, Ban, CheckCircle, Plus, Eye, ClipboardList } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { AdminFormSheet } from "@/components/ui/admin-form-sheet"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { toggleRoutineActive, createRoutine, updateRoutine } from "./actions"
import RoutineForm from "./_components/routine-form"
import type { Prisma, StepType } from "@/generated/prisma/client"

export const metadata = { title: "Routines — AOMI Kit Admin" }

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string; new?: string; edit?: string }>
}) {
  await requireRole("ADMIN")
  const { q, type, status, new: showNew, edit } = await searchParams

  const where: Prisma.RoutineTemplateWhereInput = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]
  }
  if (type) where.routineTypeId = type
  if (status === "active") where.active = true
  if (status === "inactive") where.active = false

  const [routines, routineTypes] = await Promise.all([
    prisma.routineTemplate.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        routineType: { select: { name: true } },
        _count: { select: { steps: true, diagnoses: true } },
      },
    }),
    prisma.routineType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ])

  // Setup sheet data
  let editItem = null
  let diagnoses: { id: string; name: string; active: boolean }[] = []
  let products: { id: string; name: string; stepType: StepType }[] = []

  if (edit || showNew) {
    const [allDiagnoses, allProducts] = await Promise.all([
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
    diagnoses = allDiagnoses
    products = allProducts

    if (edit) {
      editItem = await prisma.routineTemplate.findUnique({
        where: { id: edit },
        include: {
          diagnoses: { select: { diagnosisId: true } },
          steps: { orderBy: { stepNumber: "asc" } },
        },
      })
    }
  }

  const selectedIds = new Set(editItem?.diagnoses.map((d) => d.diagnosisId) ?? [])
  const diagnosisOptions = diagnoses
    .filter((d) => d.active || selectedIds.has(d.id))
    .map((d) => ({ id: d.id, name: d.name }))

  const defaults = editItem
    ? {
        name: editItem.name,
        description: editItem.description,
        routineTypeId: editItem.routineTypeId,
        durationDays: editItem.durationDays,
        generalInstructions: editItem.generalInstructions,
        active: editItem.active,
        diagnosisIds: editItem.diagnoses.map((d) => d.diagnosisId),
        steps: editItem.steps.map((s) => ({
          stepType: s.stepType,
          defaultProductId: s.defaultProductId,
          instruction: s.instruction,
        })),
      }
    : undefined

  const isSheetOpen = !!edit || !!showNew
  const qs = new URLSearchParams()
  if (q) qs.set("q", q)
  if (type) qs.set("type", type)
  if (status) qs.set("status", status)
  const closeUrl = `/admin/routines${qs.toString() ? `?${qs.toString()}` : ""}`
  const formAction = editItem ? updateRoutine.bind(null, editItem.id) : createRoutine

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routines"
        description={
          <span>
            {routines.length} skin routine template{routines.length !== 1 ? "s" : ""}
          </span>
        }
        action={
          <Button asChild>
            <Link href={`/admin/routines?new=true${qs.toString() ? `&${qs.toString()}` : ""}`}>
              <Plus className="mr-2 size-4" /> New routine
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search routines…"
          className="h-8 w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <select
          name="type"
          defaultValue={type ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          <option value="">All types</option>
          {routineTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none dark:bg-input/30"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(q || type || status) && (
          <Button variant="ghost" asChild>
            <Link href="/admin/routines">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table / Empty state */}
      {routines.length === 0 ? (
        (q || type || status) ? (
          <EmptyState
            icon={ClipboardList}
            title="No routines found"
            description="No routines matched your active filter parameters. Try resetting your search filters."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/routines">Clear Filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No routines yet"
            description="Create skin treatment routines to assign to QR token kits."
            action={
              <Button asChild>
                <Link href="/admin/routines?new=true">
                  <Plus className="mr-2 size-4" /> New routine
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Steps
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Diagnoses
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {routines.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      <Link
                        href={`/admin/routines/${r.id}`}
                        className="hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-605 dark:text-zinc-400 whitespace-nowrap">
                      {r.routineType.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {r._count.steps}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {r._count.diagnoses}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          r.active
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {r.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="View Routine Detail Page">
                              <Link href={`/admin/routines/${r.id}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Routine Detail View</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="Edit Routine Fields">
                              <Link href={`/admin/routines?edit=${r.id}${qs.toString() ? `&${qs.toString()}` : ""}`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Routine Info</TooltipContent>
                        </Tooltip>

                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={
                                      r.active
                                        ? "text-red-650 hover:text-red-755 dark:text-red-400"
                                        : "text-emerald-605 hover:text-emerald-700 dark:text-emerald-400"
                                    }
                                    aria-label={r.active ? "Deactivate Routine" : "Activate Routine"}
                                  >
                                    {r.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{r.active ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {r.active ? "Deactivate Routine" : "Activate Routine"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {r.active ? "deactivate" : "activate"} &quot;{r.name}&quot;?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <form action={toggleRoutineActive}>
                                <input type="hidden" name="id" value={r.id} />
                                <AlertDialogAction type="submit">
                                  {r.active ? "Deactivate" : "Activate"}
                                </AlertDialogAction>
                              </form>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AdminFormSheet
        open={isSheetOpen}
        title={editItem ? "Edit Routine" : "New Routine"}
        description={editItem ? `Update details for "${editItem.name}"` : "Create a new skin treatment routine template."}
        closeUrl={closeUrl}
        className="w-full sm:max-w-2xl lg:max-w-3xl"
      >
        <RoutineForm
          key={editItem?.id ?? "new"}
          action={formAction}
          routineTypes={routineTypes}
          diagnoses={diagnosisOptions}
          products={products}
          defaults={defaults}
          submitLabel={editItem ? "Save changes" : "Create routine"}
        />
      </AdminFormSheet>
    </div>
  )
}
