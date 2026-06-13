import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string | React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 dark:border-zinc-900 pb-5 mb-6", className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        {description && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </div>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {action}
        </div>
      )}
    </div>
  )
}
