import { requireRole } from "@/lib/auth-helpers"
import { AdminNavLinks } from "@/components/admin-nav"
import { AdminMobileNav } from "@/components/admin-mobile-nav"
import LogoutButton from "@/components/auth/logout-button"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("ADMIN")

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile Top Navigation */}
      <AdminMobileNav email={session.user.email ?? ""} />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-56 md:shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 h-screen sticky top-0">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            AOMI Kit — Admin
          </span>
        </div>
        <div className="flex-1 p-3">
          <AdminNavLinks />
        </div>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800 space-y-2">
          <div className="px-3 text-xs text-zinc-500 dark:text-zinc-400 truncate font-mono">
            {session.user.email}
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
        {children}
      </main>
    </div>
  )
}
