import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Pencil, Ban, CheckCircle, Plus, Layout } from "lucide-react"
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
  createRoutineType,
  updateRoutineType,
  toggleRoutineTypeActive,
} from "./actions"
import RoutineTypeForm from "./_components/routine-type-form"

export const metadata = { title: "Routine Types — AOMI Kit Admin" }

export default async function RoutineTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; new?: string }>
}) {
  await requireRole("ADMIN")
  const { q, edit, new: showNew } = await searchParams

  const routineTypes = await prisma.routineType.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { templates: true } } },
  })

  const editItem = edit
    ? await prisma.routineType.findUnique({ where: { id: edit } })
    : null

  const updateAction = editItem
    ? updateRoutineType.bind(null, editItem.id)
    : null

  const isSheetOpen = !!edit || !!showNew
  const closeUrl = q ? `/admin/routine-types?q=${q}` : "/admin/routine-types"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Routine Types"
        description={
          <span>
            {routineTypes.length} routine classification type{routineTypes.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </span>
        }
        action={
          <Button asChild>
            <Link href={`/admin/routine-types?new=true${q ? `&q=${q}` : ""}`}>
              <Plus className="mr-2 size-4" /> New routine type
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
            <Link href="/admin/routine-types">Clear</Link>
          </Button>
        )}
      </form>

      {/* Table / Empty state */}
      {routineTypes.length === 0 ? (
        q ? (
          <EmptyState
            icon={Layout}
            title="No routine types found"
            description={`No routine types matched your search filter "${q}". Try clearing the search query.`}
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/routine-types">Clear Search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Layout}
            title="No routine types yet"
            description="Create your first routine type classification (e.g. Morning, Evening, Weekly Treatment)."
            action={
              <Button asChild>
                <Link href="/admin/routine-types?new=true">
                  <Plus className="mr-2 size-4" /> New routine type
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
                    Templates
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
                {routineTypes.map((rt) => (
                  <tr
                    key={rt.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                      {rt.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-550 dark:text-zinc-400 whitespace-nowrap">
                      {rt.slug}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {rt._count.templates}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={
                          rt.active
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-550 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {rt.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild aria-label="Edit Routine Type">
                              <Link href={`/admin/routine-types?edit=${rt.id}${q ? `&q=${q}` : ""}`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Routine Type</TooltipContent>
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
                                      rt.active
                                        ? "text-red-650 hover:text-red-750 dark:text-red-400"
                                        : "text-emerald-605 hover:text-emerald-700 dark:text-emerald-400"
                                    }
                                    aria-label={rt.active ? "Deactivate Routine Type" : "Activate Routine Type"}
                                  >
                                    {rt.active ? <Ban className="size-4" /> : <CheckCircle className="size-4" />}
                                  </Button>
                                </AlertDialogTrigger>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{rt.active ? "Deactivate" : "Activate"}</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {rt.active ? "Deactivate Routine Type" : "Activate Routine Type"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to {rt.active ? "deactivate" : "activate"} &quot;{rt.name}&quot;?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <form action={toggleRoutineTypeActive}>
                                <input type="hidden" name="id" value={rt.id} />
                                <AlertDialogAction type="submit">
                                  {rt.active ? "Deactivate" : "Activate"}
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
        title={editItem ? "Edit Routine Type" : "New Routine Type"}
        description={editItem ? `Update details for "${editItem.name}"` : "Create a new skin routine classification type."}
        closeUrl={closeUrl}
        className="w-full sm:max-w-md"
      >
        <RoutineTypeForm
          key={editItem?.id ?? "new"}
          action={updateAction ?? createRoutineType}
          editItem={editItem ?? undefined}
        />
      </AdminFormSheet>
    </div>
  )
}
