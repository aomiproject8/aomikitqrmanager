import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { QrCode, Plus } from "lucide-react"

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
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Seller Panel"
        description={`Welcome back, ${session.user.name ?? session.user.email}`}
        action={
          <Button asChild>
            <Link href="/seller/assign">
              <Plus className="mr-2 size-4" /> Assign QR Kit
            </Link>
          </Button>
        }
      />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Recent Assignments
        </h2>
        
        {recent.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title="No assignments yet"
            description="You have not assigned any QR kits to routine templates yet."
            action={
              <Button asChild>
                <Link href="/seller/assign">
                  <Plus className="mr-2 size-4" /> Assign your first kit
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Token
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Routine
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Assigned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-zinc-900 dark:text-zinc-50 whitespace-nowrap font-bold">
                        {p.qrToken.token}
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {p.template.name}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge variant="secondary">{p.status}</Badge>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {p.createdAt.toISOString().slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
