import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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
  searchParams: Promise<{ q?: string; edit?: string }>
}) {
  await requireRole("ADMIN")
  const { q, edit } = await searchParams

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Diagnoses
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {diagnoses.length} diagnosis{diagnoses.length !== 1 ? "es" : ""}
          {q ? ` matching "${q}"` : ""}
        </p>
      </div>

      {/* Create or Edit form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {editItem ? `Editing: ${editItem.name}` : "Add new diagnosis"}
        </h2>
        <DiagnosisForm
          action={updateAction ?? createDiagnosis}
          editItem={editItem ?? undefined}
        />
      </div>

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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {diagnoses.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No diagnoses found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Slug
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {d.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    {d.slug}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-500 dark:text-zinc-400 truncate">
                    {d.description ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        d.active
                          ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }
                    >
                      {d.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/diagnoses?edit=${d.id}${q ? `&q=${q}` : ""}`}
                        >
                          Edit
                        </Link>
                      </Button>
                      <form action={toggleDiagnosisActive}>
                        <input type="hidden" name="id" value={d.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className={
                            d.active
                              ? "text-red-600 hover:text-red-700 dark:text-red-400"
                              : "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                          }
                        >
                          {d.active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
