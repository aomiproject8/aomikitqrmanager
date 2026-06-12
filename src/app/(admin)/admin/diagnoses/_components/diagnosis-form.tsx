"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toSlug } from "@/lib/slug"
import type { DiagnosisActionState } from "../actions"
import type { Diagnosis } from "@/generated/prisma/client"
import Link from "next/link"

type Props = {
  action: (
    prevState: DiagnosisActionState,
    formData: FormData
  ) => Promise<DiagnosisActionState>
  editItem?: Pick<Diagnosis, "id" | "name" | "slug" | "description">
}

export default function DiagnosisForm({ action, editItem }: Props) {
  const [state, formAction, pending] = useActionState(action, {})
  const [slug, setSlug] = useState(editItem?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(!!editItem)

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor={`name-${editItem?.id ?? "new"}`}>
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`name-${editItem?.id ?? "new"}`}
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
          <Label htmlFor={`slug-${editItem?.id ?? "new"}`}>
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`slug-${editItem?.id ?? "new"}`}
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

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor={`description-${editItem?.id ?? "new"}`}>
          Description
        </Label>
        <Textarea
          id={`description-${editItem?.id ?? "new"}`}
          name="description"
          defaultValue={editItem?.description ?? ""}
          placeholder="Optional description…"
          disabled={pending}
          rows={2}
        />
        {state.errors?.description?.[0] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : editItem ? "Update" : "Add diagnosis"}
        </Button>
        {editItem && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/diagnoses">Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
