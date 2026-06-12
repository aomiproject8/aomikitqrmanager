"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  validateToken,
  getRoutinesForDiagnosis,
  getRoutinePreview,
  confirmAssignment,
  type RoutineOption,
  type RoutinePreview,
} from "../actions"

type Diagnosis = { id: string; name: string }

const STEPS = ["Token", "Diagnosis", "Routine", "Review", "Confirm"]

export default function AssignFlow({ diagnoses }: { diagnoses: Diagnosis[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState(0)

  // Step 1
  const [tokenInput, setTokenInput] = useState("")
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [validatedToken, setValidatedToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Step 2
  const [diagnosisId, setDiagnosisId] = useState("")

  // Step 3
  const [routines, setRoutines] = useState<RoutineOption[]>([])
  const [routineId, setRoutineId] = useState<string | null>(null)

  // Step 4
  const [preview, setPreview] = useState<RoutinePreview | null>(null)
  const [selections, setSelections] = useState<Record<string, string>>({})

  function handleValidateToken() {
    setTokenError(null)
    startTransition(async () => {
      const res = await validateToken(tokenInput)
      if (!res.ok) {
        setTokenError(res.error)
        setTokenId(null)
        return
      }
      setTokenId(res.tokenId)
      setValidatedToken(res.token)
      setStep(1)
    })
  }

  function handleSelectDiagnosis() {
    if (!diagnosisId) return
    startTransition(async () => {
      const list = await getRoutinesForDiagnosis(diagnosisId)
      setRoutines(list)
      setRoutineId(null)
      setStep(2)
    })
  }

  function handleSelectRoutine(id: string) {
    startTransition(async () => {
      const p = await getRoutinePreview(id)
      if (!p) {
        toast.error("Could not load routine")
        return
      }
      setRoutineId(id)
      setPreview(p)
      // Default selection per step.
      const initial: Record<string, string> = {}
      for (const s of p.steps) {
        const fallback = s.defaultProductId ?? s.options[0]?.id ?? ""
        if (fallback) initial[s.stepId] = fallback
      }
      setSelections(initial)
      setStep(3)
    })
  }

  function handleConfirm() {
    if (!tokenId || !routineId) return
    startTransition(async () => {
      const res = await confirmAssignment({
        tokenId,
        routineId,
        selections: Object.entries(selections).map(([stepId, productId]) => ({
          stepId,
          productId,
        })),
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("Kit assigned")
      setStep(4)
      router.refresh()
    })
  }

  const diagnosisName = diagnoses.find((d) => d.id === diagnosisId)?.name

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full font-medium " +
                (i < step
                  ? "bg-emerald-600 text-white"
                  : i === step
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800")
              }
            >
              {i + 1}
            </span>
            <span
              className={
                i === step
                  ? "font-medium text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400"
              }
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="text-zinc-300">→</span>}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* STEP 1 — Token */}
        {step === 0 && (
          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token">Scan or enter token</Label>
              <Input
                id="token"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleValidateToken()
                  }
                }}
                placeholder="AOMI-KIT-XXXXXX"
                className="font-mono uppercase"
                disabled={pending}
                autoFocus
              />
              {tokenError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {tokenError}
                </p>
              )}
            </div>
            <Button onClick={handleValidateToken} disabled={pending || !tokenInput}>
              {pending ? "Validating…" : "Validate token"}
            </Button>
          </div>
        )}

        {/* STEP 2 — Diagnosis */}
        {step === 1 && (
          <div className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Select diagnosis</Label>
              <Select
                value={diagnosisId}
                onValueChange={setDiagnosisId}
                disabled={pending}
              >
                <SelectTrigger id="diagnosis" className="w-full">
                  <SelectValue placeholder="Choose a diagnosis…" />
                </SelectTrigger>
                <SelectContent>
                  {diagnoses.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)} disabled={pending}>
                Back
              </Button>
              <Button onClick={handleSelectDiagnosis} disabled={pending || !diagnosisId}>
                {pending ? "Loading…" : "Find routines"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Routine */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Routines matching <strong>{diagnosisName}</strong>
            </p>
            {routines.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No active routines for this diagnosis.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {routines.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRoutine(r.id)}
                    disabled={pending}
                    className="rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-zinc-900 disabled:opacity-50 dark:border-zinc-800 dark:hover:border-zinc-50"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {r.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                      <Badge variant="secondary">{r.routineTypeName}</Badge>
                      <span>{r.stepCount} steps</span>
                      {r.durationDays && <span>· {r.durationDays} days</span>}
                    </div>
                    {r.description && (
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                        {r.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
            <Button variant="ghost" onClick={() => setStep(1)} disabled={pending}>
              Back
            </Button>
          </div>
        )}

        {/* STEP 4 — Review & replace */}
        {step === 3 && preview && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {preview.name}
              </h3>
              {preview.generalInstructions && (
                <p className="mt-1 text-sm text-zinc-500">
                  {preview.generalInstructions}
                </p>
              )}
            </div>

            <ul className="space-y-3">
              {preview.steps.map((s) => (
                <li
                  key={s.stepId}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-400">
                      Step {s.stepNumber}
                    </span>
                    <Badge variant="secondary">{s.stepType}</Badge>
                  </div>
                  {s.instruction && (
                    <p className="mb-2 text-sm text-zinc-500">{s.instruction}</p>
                  )}
                  {s.options.length === 0 ? (
                    <p className="text-sm text-red-500">
                      No products available for this step.
                    </p>
                  ) : (
                    <Select
                      value={selections[s.stepId] ?? ""}
                      onValueChange={(v) =>
                        setSelections((prev) => ({ ...prev, [s.stepId]: v }))
                      }
                      disabled={pending}
                    >
                      <SelectTrigger className="w-full sm:w-80">
                        <SelectValue placeholder="Select product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {s.options.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                            {o.id === s.defaultProductId ? " (default)" : ""}
                            {o.isReplacement && o.id !== s.defaultProductId
                              ? " (alt)"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={pending}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  pending ||
                  preview.steps.some((s) => !selections[s.stepId])
                }
              >
                {pending ? "Assigning…" : "Confirm assignment"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5 — Done */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/40">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Kit assigned
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Token{" "}
                <span className="font-mono">{validatedToken}</span> is now
                assigned.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  // Reset for another assignment.
                  setStep(0)
                  setTokenInput("")
                  setTokenId(null)
                  setValidatedToken(null)
                  setDiagnosisId("")
                  setRoutines([])
                  setRoutineId(null)
                  setPreview(null)
                  setSelections({})
                }}
              >
                Assign another
              </Button>
              <Button variant="outline" onClick={() => router.push("/seller")}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
