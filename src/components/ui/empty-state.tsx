import { LucideIcon, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string | React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon = HelpCircle,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h3>
      {description && (
        <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          {description}
        </div>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  )
}
