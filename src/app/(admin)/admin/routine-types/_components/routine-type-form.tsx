"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toSlug } from "@/lib/slug"
import type { RoutineTypeActionState } from "../actions"
import type { RoutineType } from "@/generated/prisma/client"
import Link from "next/link"

type Props = {
  action: (
    prevState: RoutineTypeActionState,
    formData: FormData
  ) => Promise<RoutineTypeActionState>
  editItem?: Pick<RoutineType, "id" | "name" | "slug">
}

export default function RoutineTypeForm({ action, editItem }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const [slug, setSlug] = useState(editItem?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!editItem)

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor={`rt-name-${editItem?.id ?? "new"}`}>
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`rt-name-${editItem?.id ?? "new"}`}
            name="name"
            defaultValue={editItem?.name ?? ""}
            disabled={pending}
            aria-invalid={!!state.errors?.name}
            onChange={(e) => {
              if (!slugTouched) setSlug(toSlug(e.target.value))
            }}
          />
          {state.errors?.name?.[0] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.errors.name[0]}
            </p>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <Label htmlFor={`rt-slug-${editItem?.id ?? "new"}`}>
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`rt-slug-${editItem?.id ?? "new"}`}
            name="slug"
            value={slug}
            disabled={pending}
            aria-invalid={!!state.errors?.slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
          />
          {state.errors?.slug?.[0] && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.errors.slug[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : editItem ? "Update" : "Add routine type"}
        </Button>
        {editItem && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/routine-types">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
