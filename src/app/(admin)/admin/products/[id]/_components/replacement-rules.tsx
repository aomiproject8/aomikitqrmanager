"use client"

import { useActionState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  addReplacementRule,
  deleteReplacementRule,
  type ReplacementActionState,
} from "../replacement-actions"

type RuleRow = {
  id: string
  stepType: string
  replacement: { id: string; name: string; sku: string | null }
}

type ProductOption = { id: string; name: string; stepType: string }

type Props = {
  sourceProductId: string
  sourceStepType: string
  rules: RuleRow[]
  products: ProductOption[]
}

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

export default function ReplacementRules({
  sourceProductId,
  sourceStepType,
  rules,
  products,
}: Props) {
  const addAction = addReplacementRule.bind(null, sourceProductId)
  const deleteAction = deleteReplacementRule.bind(null, sourceProductId)

  const [, addFormAction, adding] = useActionState<
    ReplacementActionState,
    FormData
  >(async (prev, fd) => {
    const res = await addAction(prev, fd)
    if (res.error) toast.error(res.error)
    else if (res.ok) toast.success("Replacement rule added")
    return res
  }, {})

  const [, deleteFormAction, deleting] = useActionState<
    ReplacementActionState,
    FormData
  >(async (prev, fd) => {
    const res = await deleteAction(prev, fd)
    if (res.error) toast.error(res.error)
    else if (res.ok) toast.success("Rule removed")
    return res
  }, {})

  const candidates = products.filter((p) => p.id !== sourceProductId)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Replacement Rules
        </h2>
        <p className="mt-0.5 text-xs text-zinc-400">
          Products that may be swapped in for this one during assignment.
        </p>
      </div>

      {/* Add form */}
      <form
        action={addFormAction}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <div className="space-y-1.5">
          <Label htmlFor="replacementProductId">Replacement product</Label>
          <Select name="replacementProductId" disabled={adding}>
            <SelectTrigger id="replacementProductId" className="w-64">
              <SelectValue placeholder="Select product…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.stepType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rule-stepType">Step type</Label>
          <Select
            name="stepType"
            defaultValue={sourceStepType}
            disabled={adding}
          >
            <SelectTrigger id="rule-stepType" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add rule"}
        </Button>
      </form>

      {/* Existing rules */}
      {rules.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          No replacement rules.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800/60 dark:border-zinc-800">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{rule.stepType}</Badge>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {rule.replacement.name}
                </span>
                {rule.replacement.sku && (
                  <span className="font-mono text-xs text-zinc-400">
                    {rule.replacement.sku}
                  </span>
                )}
              </div>
              <form action={deleteFormAction}>
                <input type="hidden" name="ruleId" value={rule.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
