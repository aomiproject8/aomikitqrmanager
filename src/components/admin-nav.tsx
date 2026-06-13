"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface AdminNavLinksProps {
  onLinkClick?: () => void
}

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/diagnoses", label: "Diagnoses" },
  { href: "/admin/routine-types", label: "Routine Types" },
  { href: "/admin/routines", label: "Routines" },
  { href: "/admin/qr-tokens", label: "QR Tokens" },
]

export function AdminNavLinks({ onLinkClick }: AdminNavLinksProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        // Active check: exact for /admin, startsWith for child paths
        const isActive = item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-50 font-semibold"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
