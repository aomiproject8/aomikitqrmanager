"use client"

import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { AdminNavLinks } from "./admin-nav"
import LogoutButton from "@/components/auth/logout-button"

interface AdminMobileNavProps {
  email: string
}

export function AdminMobileNav({ email }: AdminMobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 md:hidden sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-64 flex-col justify-between p-4 bg-white dark:bg-zinc-900 border-r dark:border-zinc-800">
            <div className="space-y-4">
              <SheetHeader className="text-left border-b pb-4 dark:border-zinc-850">
                <SheetTitle className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  AOMI Kit — Admin
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Navigation menu for admin section.
                </SheetDescription>
              </SheetHeader>
              <AdminNavLinks onLinkClick={() => setOpen(false)} />
            </div>
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800 space-y-2">
              <div className="px-3 text-xs text-zinc-550 dark:text-zinc-400 truncate font-mono">
                {email}
              </div>
              <div className="px-1">
                <LogoutButton />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          AOMI Kit — Admin
        </span>
      </div>
    </div>
  )
}
