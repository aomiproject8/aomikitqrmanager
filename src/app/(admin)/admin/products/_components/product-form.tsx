"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProductActionState } from "../actions"
import type { Product } from "@/generated/prisma/client"
import Link from "next/link"

const STEP_TYPES = [
  "CLEANSER",
  "TONER",
  "SERUM",
  "CREAM",
  "SUNSCREEN",
  "EXFOLIANT",
  "TREATMENT",
  "MOISTURIZER",
] as const

type Props = {
  action: (
    prevState: ProductActionState,
    formData: FormData
  ) => Promise<ProductActionState>
  defaultValues?: Pick<
    Product,
    "name" | "sku" | "category" | "functionDescription" | "stepType"
  >
}

export default function ProductForm({ action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-5 max-w-lg">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          disabled={pending}
          aria-invalid={!!state.errors?.name}
        />
        {state.errors?.name?.[0] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.name[0]}
          </p>
        )}
      </div>

      {/* SKU */}
      <div className="space-y-1.5">
        <Label htmlFor="sku">SKU</Label>
        <Input
          id="sku"
          name="sku"
          defaultValue={defaultValues?.sku ?? ""}
          placeholder="e.g. AOMI-CLN-001"
          disabled={pending}
          aria-invalid={!!state.errors?.sku}
        />
        {state.errors?.sku?.[0] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.sku[0]}
          </p>
        )}
      </div>

      {/* Step Type */}
      <div className="space-y-1.5">
        <Label htmlFor="stepType">
          Step Type <span className="text-red-500">*</span>
        </Label>
        <Select
          name="stepType"
          defaultValue={defaultValues?.stepType ?? ""}
          disabled={pending}
        >
          <SelectTrigger id="stepType" className="w-full" aria-invalid={!!state.errors?.stepType}>
            <SelectValue placeholder="Select step type…" />
          </SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.errors?.stepType?.[0] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.stepType[0]}
          </p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          name="category"
          defaultValue={defaultValues?.category ?? ""}
          placeholder="e.g. Cleanser"
          disabled={pending}
        />
      </div>

      {/* Function Description */}
      <div className="space-y-1.5">
        <Label htmlFor="functionDescription">Function Description</Label>
        <Textarea
          id="functionDescription"
          name="functionDescription"
          defaultValue={defaultValues?.functionDescription ?? ""}
          placeholder="Describe what this product does…"
          disabled={pending}
          rows={3}
        />
        {state.errors?.functionDescription?.[0] && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.functionDescription[0]}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/admin/products">Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
