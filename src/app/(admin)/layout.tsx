import { requireRole } from "@/lib/auth-helpers"
import { AdminNavLinks } from "@/components/admin-nav"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import LogoutButton from "@/components/auth/logout-button"
import Image from "next/image"
import { ShieldCheck } from "lucide-react"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("ADMIN")

  return (
    <div className="min-h-screen md:grid md:grid-cols-[13.25rem_minmax(0,1fr)]">
      <AdminMobileNav email={session.user.email ?? ""} />

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-2 pb-5 pt-1">
          <Image
            src="/logo/aomiLogo.svg"
            alt="AOMI"
            width={100}
            height={30}
            className="h-7 w-auto object-contain"
            priority
          />
        </div>
        <div className="flex-1 py-5">
          <p className="mb-2 px-3 text-[0.65rem] font-semibold tracking-[0.18em] text-sidebar-foreground/35 uppercase">
            Workspace
          </p>
          <AdminNavLinks />
        </div>
        <div className="space-y-2 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent/60 p-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-sidebar-primary/15 text-sidebar-primary">
              <ShieldCheck className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium">Administrator</p>
              <p className="truncate text-[0.7rem] text-sidebar-foreground/50">
                {session.user.email}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto w-full max-w-[92rem] p-4 sm:p-6 lg:p-8 xl:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
