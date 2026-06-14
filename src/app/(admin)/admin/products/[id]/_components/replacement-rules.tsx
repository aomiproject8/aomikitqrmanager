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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold">Replacement Rules</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Products that may be swapped in for this one during assignment.
          Candidates must share the same step type ({sourceStepType}).
        </p>
      </div>

      {/* Add form — stepType is derived server-side from the source product */}
      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No other active {sourceStepType} products to add as replacements.
        </p>
      ) : (
        <form action={addFormAction} className="form-section space-y-1.5">
          <Label htmlFor="replacementProductId">Replacement product</Label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select name="replacementProductId" disabled={adding}>
              <SelectTrigger id="replacementProductId" className="w-full sm:w-64">
                <SelectValue placeholder="Select product…" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="submit" disabled={adding} className="shrink-0">
              {adding ? "Adding…" : "Add rule"}
            </Button>
          </div>
        </form>
      )}

      {/* Existing rules */}
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">No replacement rules.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{rule.stepType}</Badge>
                <span className="text-sm font-medium">
                  {rule.replacement.name}
                </span>
                {rule.replacement.sku && (
                  <span className="font-mono text-xs text-muted-foreground">
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
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
