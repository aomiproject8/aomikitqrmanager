"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { generateBatch, type GenerateState } from "./generate-actions"

export default function GenerateForm() {
  const [state, formAction, pending] = useActionState<GenerateState, FormData>(
    generateBatch,
    {}
  )

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="quantity">
          Quantity <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={10000}
          defaultValue={100}
          disabled={pending}
          required
        />
        <p className="text-xs text-zinc-400">Between 1 and 10,000 tokens.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prefix">Prefix</Label>
        <Input
          id="prefix"
          name="prefix"
          defaultValue="AOMI-KIT"
          placeholder="AOMI-KIT"
          disabled={pending}
        />
        <p className="text-xs text-zinc-400">
          Tokens look like PREFIX-XXXXXX.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="batchName">Batch name</Label>
        <Input
          id="batchName"
          name="batchName"
          placeholder="Optional label, e.g. Spring 2026"
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Generating…" : "Generate batch"}
      </Button>
    </form>
  )
}
