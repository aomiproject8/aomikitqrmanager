"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface AdminFormSheetProps {
  open: boolean
  title: string
  description: string
  closeUrl: string
  children: React.ReactNode
  className?: string
}

export function AdminFormSheet({ open, title, description, closeUrl, children, className }: AdminFormSheetProps) {
  const router = useRouter()

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      router.push(closeUrl)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className={cn("flex h-full flex-col gap-0 p-0", className)}>
        <SheetHeader className="shrink-0 border-b px-6 py-5 flex flex-col gap-1">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-sm">{description}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
