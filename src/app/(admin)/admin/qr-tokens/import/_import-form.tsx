"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { importTokens, type ImportState } from "./import-actions"

export default function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importTokens,
    {}
  )

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
          {state.error}
        </div>
      )}

      {state.result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-800 dark:text-emerald-300">
            Import complete
          </p>
          <ul className="mt-1 space-y-0.5 text-emerald-700 dark:text-emerald-400">
            <li>Total rows: {state.result.total}</li>
            <li>Inserted: {state.result.inserted}</li>
            <li>Skipped (duplicate): {state.result.skippedDuplicate}</li>
            <li>Invalid: {state.result.invalid}</li>
          </ul>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="batchName">Batch name</Label>
        <Input
          id="batchName"
          name="batchName"
          placeholder="Optional label for this import"
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="csvText">Paste CSV</Label>
        <Textarea
          id="csvText"
          name="csvText"
          rows={8}
          placeholder={"token\nAOMI-KIT-7F3K9Q\nAOMI-KIT-2M8XQT"}
          disabled={pending}
          className="font-mono text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file">…or upload a .csv file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv,text/plain"
          disabled={pending}
          className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-200 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-800 dark:hover:file:bg-zinc-700"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Importing…" : "Import tokens"}
      </Button>
    </form>
  )
}
