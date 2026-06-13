"use client"

import { useActionState, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SheetFooter } from "@/components/ui/sheet"
import Link from "next/link"
import { importTokens, type ImportState } from "./import-actions"

export default function ImportForm() {
  const [resetKey, setResetKey] = useState(0)
  return (
    <ImportFormInner
      key={resetKey}
      onReset={() => setResetKey((prev) => prev + 1)}
    />
  )
}

function ImportFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importTokens,
    {}
  )

  return (
    <form action={formAction} className="flex flex-1 flex-col min-h-0">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {state.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {state.error}
          </div>
        )}

        {state.result ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Import complete successfully
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Token duplicate verification and structural validations completed.
              </p>
            </div>

            {/* Success Summary statistics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Rows</div>
                <div className="text-2xl font-bold mt-1 text-zinc-800 dark:text-zinc-100">{state.result.total}</div>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/20 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/10">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium font-semibold">Inserted</div>
                <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{state.result.inserted}</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Skipped Duplicate</div>
                <div className="text-2xl font-bold mt-1 text-zinc-800 dark:text-zinc-100">{state.result.skippedDuplicate}</div>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/20 p-4 dark:border-red-900/40 dark:bg-red-950/10">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium font-semibold">Invalid</div>
                <div className="text-2xl font-bold mt-1 text-red-700 dark:text-red-350">{state.result.invalid}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="batchName">Batch name</Label>
              <Input
                id="batchName"
                name="batchName"
                placeholder="Optional label for this import"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="csvText">Paste CSV</Label>
              <Textarea
                id="csvText"
                name="csvText"
                rows={8}
                placeholder={"token\nAOMI-KIT-7F3K9Q\nAOMI-KIT-2M8XQT"}
                disabled={pending}
                className="font-mono text-xs min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
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
          </div>
        )}
      </div>

      <SheetFooter className="shrink-0 border-t bg-background px-6 py-4 flex items-center justify-end gap-3">
        {state.result ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              Import another file
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link href="/admin/qr-tokens">Close</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" asChild disabled={pending}>
              <Link href="/admin/qr-tokens">Cancel</Link>
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Importing…" : "Import tokens"}
            </Button>
          </>
        )}
      </SheetFooter>
    </form>
  )
}
