import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Seller Panel — AOMI Kit QR Manager" }

export default async function SellerPage() {
  const session = await requireAuth()

  const recent = await prisma.package.findMany({
    where: { createdByUserId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      qrToken: { select: { token: true } },
      template: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Seller Panel
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Welcome back, {session.user.name ?? session.user.email}
          </p>
        </div>
        <Button asChild>
          <Link href="/seller/assign">Assign QR Kit</Link>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recent assignments
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No assignments yet.{" "}
            <Link
              href="/seller/assign"
              className="text-zinc-900 underline dark:text-zinc-50"
            >
              Assign your first kit
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Token
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Routine
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Assigned
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                >
                  <td className="px-5 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-50">
                    {p.qrToken.token}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.template.name}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="secondary">{p.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400">
                    {p.createdAt.toISOString().slice(0, 10)}
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
