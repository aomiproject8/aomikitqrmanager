import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil, Ban, CheckCircle, Plus, Activity } from "lucide-react"
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
import {
  createDiagnosis,
  updateDiagnosis,
  toggleDiagnosisActive,
} from "./actions"
import DiagnosisForm from "./_components/diagnosis-form"

export const metadata = { title: "Diagnoses — AOMI Kit Admin" }

export default async function DiagnosesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; new?: string }>
}) {
  await requireRole("ADMIN")
  const { q, edit, new: showNew } = await searchParams

  const diagnoses = await prisma.diagnosis.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
  })

  const editItem = edit
    ? await prisma.diagnosis.findUnique({ where: { id: edit } })
    : null

  const updateAction = editItem
    ? updateDiagnosis.bind(null, editItem.id)
    : null

  const isSheetOpen = !!edit || !!showNew
  const closeUrl = q ? `/admin/diagnoses?q=${q}` : "/admin/diagnoses"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Diagnoses"
        description={
          <span>
            {diagnoses.length} skin diagnosis profile{diagnoses.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </span>
        }
        action={
          <Button asChild>
            <Link href={`/admin/diagnoses?new=true${q ? `&q=${q}` : ""}`}>
              <Plus className="mr-2 size-4" /> New diagnosis
            </Link>
          </Button>
        }
      />

      {/* Search */}
      <form method="GET" className="flex gap-2 max-w-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or slug…"
          className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <Button type="submit" variant="outline" size="default">
          Search
        </Button>
        {q && (
          <Button variant="ghost" asChild>
            <Link href="/admin/diagnoses">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table / Empty state */}
      {diagnoses.length === 0 ? (
        q ? (
          <EmptyState
            icon={Activity}
            title="No diagnoses found"
            description={`No diagnosis profiles matched your search filter "${q}". Try clearing the search query.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/diagnoses">Clear Search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Activity}
            title="No diagnoses yet"
            description="Create your first skin diagnosis profile to link with customized treatment routines."
            action={
              <Button asChild>
                <Link href="/admin/diagnoses?new=true">
                  <Plus className="mr-2 size-4" /> New diagnosis
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
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    Description
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
                {diagnoses.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      {d.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-550 dark:text-zinc-400 whitespace-nowrap">
                      {d.slug}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400 truncate whitespace-nowrap">
                      {d.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          d.active
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {d.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="Edit Diagnosis">
                              <Link href={`/admin/diagnoses?edit=${d.id}${q ? `&q=${q}` : ""}`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Diagnosis</TooltipContent>
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
                                      d.active
                                        ? "text-red-650 hover:text-red-750 dark:text-red-400"
                                        : "text-emerald-605 hover:text-emerald-700 dark:text-emerald-400"
                                    }
                                    aria-label={d.active ? "Deactivate Diagnosis" : "Activate Diagnosis"}
                                  >
                                    {d.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{d.active ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {d.active ? "Deactivate Diagnosis" : "Activate Diagnosis"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {d.active ? "deactivate" : "activate"} &quot;{d.name}&quot;?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <form action={toggleDiagnosisActive}>
                                <input type="hidden" name="id" value={d.id} />
                                <AlertDialogAction type="submit">
                                  {d.active ? "Deactivate" : "Activate"}
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
        title={editItem ? "Edit Diagnosis" : "New Diagnosis"}
        description={editItem ? `Update details for "${editItem.name}"` : "Create a new skin diagnosis profile."}
        closeUrl={closeUrl}
        className="w-full sm:max-w-md"
      >
        <DiagnosisForm
          key={editItem?.id ?? "new"}
          action={updateAction ?? createDiagnosis}
          editItem={editItem ?? undefined}
        />
      </AdminFormSheet>
    </div>
  )
}
