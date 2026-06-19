"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { escapeSpreadsheetValue } from "@/lib/spreadsheet-safe"
import type { ImportActionState } from "@/lib/server/excel/action-helpers"
import type { ImportError } from "@/lib/server/excel/core"

type ImportAction = (
  prev: ImportActionState,
  formData: FormData
) => Promise<ImportActionState>

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function csvCell(value: string): string {
  // Formula-injection safe + CSV-quoted.
  return `"${escapeSpreadsheetValue(value).replace(/"/g, '""')}"`
}

export function ExcelImportDialog({
  entityLabel,
  templateHref,
  previewAction,
  commitAction,
}: {
  entityLabel: string
  templateHref: string
  previewAction: ImportAction
  commitAction: ImportAction
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<ImportActionState>({ phase: "idle" })
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function resetAll() {
    setFile(null)
    setState({ phase: "idle" })
    if (inputRef.current) inputRef.current.value = ""
  }

  function buildFormData() {
    const fd = new FormData()
    if (file) fd.set("file", file)
    return fd
  }

  function runPreview() {
    if (!file) return
    startTransition(async () => {
      const res = await previewAction({ phase: "idle" }, buildFormData())
      setState(res)
      if (res.phase === "error" && res.error) toast.error(res.error)
    })
  }

  function runCommit() {
    if (!file) return
    startTransition(async () => {
      const res = await commitAction({ phase: "idle" }, buildFormData())
      setState(res)
      if (res.phase === "error" && res.error) toast.error(res.error)
      else if (res.phase === "result") {
        toast.success(
          `Imported ${res.result?.created ?? 0} ${entityLabel.toLowerCase()}`
        )
      }
    })
  }

  function downloadErrors(errors: ImportError[]) {
    const header = ["sheet", "row", "field", "message"]
    const lines = [
      header.join(","),
      ...errors.map((e) =>
        [String(e.sheet), String(e.row), String(e.field), String(e.message)]
          .map(csvCell)
          .join(",")
      ),
    ]
    const blob = new Blob([lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${entityLabel.toLowerCase().replace(/\s+/g, "-")}-import-errors.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const preview = state.phase === "preview" ? state.preview : undefined
  const result = state.phase === "result" ? state.result : undefined
  const errors = preview?.errors ?? result?.errors ?? []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetAll()
      }}
    >
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 size-4" /> Import from Excel
      </Button>

      <DialogContent className="max-h-[85vh] gap-4 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import {entityLabel} from Excel</DialogTitle>
          <DialogDescription>
            Upload a filled-in <code>.xlsx</code> template. You will see a dry-run
            preview before anything is saved.
          </DialogDescription>
        </DialogHeader>

        {/* File picker (always visible) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setState({ phase: "idle" })
              }}
            />
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              <Upload className="mr-2 size-4" /> Choose file
            </Button>
            <Button variant="ghost" asChild>
              <a href={templateHref}>
                <Download className="mr-2 size-4" /> Download template
              </a>
            </Button>
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{file.name}</span> ·{" "}
              {formatBytes(file.size)}
            </p>
          )}
        </div>

        {/* Preview action */}
        {state.phase !== "result" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={runPreview} disabled={!file || pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {pending ? "Validating…" : "Preview (dry run)"}
            </Button>
          </div>
        )}

        {/* Error (parse/auth/etc.) */}
        {state.phase === "error" && state.error && (
          <div className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Preview summary */}
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Total rows" value={preview.totalRows} />
              <SummaryStat label="To create" value={preview.toCreate} tone="success" />
              <SummaryStat label="Skip existing" value={preview.toSkip} />
              <SummaryStat label="Invalid" value={preview.invalid} tone="destructive" />
            </div>

            {preview.createSamples.length > 0 && (
              <SampleList title="Will be created" items={preview.createSamples} />
            )}
            {preview.skipSamples.length > 0 && (
              <SampleList
                title="Already exist (skipped)"
                items={preview.skipSamples}
              />
            )}

            <ErrorBlock errors={errors} onDownload={downloadErrors} />

            <div className="flex flex-wrap gap-2">
              <Button onClick={runCommit} disabled={pending || preview.toCreate === 0}>
                {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {pending
                  ? "Importing…"
                  : `Confirm import (${preview.toCreate})`}
              </Button>
              <Button variant="ghost" onClick={resetAll} disabled={pending}>
                Choose another file
              </Button>
            </div>
            {preview.toCreate === 0 && (
              <p className="text-xs text-muted-foreground">
                Nothing new to import — every valid row already exists.
              </p>
            )}
          </div>
        )}

        {/* Final result */}
        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl bg-success/15 px-3 py-2.5 text-sm text-success-foreground">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                Created {result.created}, skipped {result.skipped}, invalid{" "}
                {result.invalid}.
              </span>
            </div>
            <ErrorBlock errors={errors} onDownload={downloadErrors} />
            <Button onClick={resetAll}>Import another file</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "success" | "destructive"
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          "text-xl font-semibold " +
          (tone === "success"
            ? "text-success-foreground"
            : tone === "destructive" && value > 0
              ? "text-destructive"
              : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  )
}

function SampleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="section-label">{title}</p>
      <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
        {items.map((it, i) => (
          <li key={i} className="truncate">
            {it}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ErrorBlock({
  errors,
  onDownload,
}: {
  errors: ImportError[]
  onDownload: (errors: ImportError[]) => void
}) {
  if (errors.length === 0) return null
  const shown = errors.slice(0, 50)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="section-label text-destructive">
          {errors.length} error{errors.length !== 1 ? "s" : ""}
        </p>
        <Button variant="ghost" size="sm" onClick={() => onDownload(errors)}>
          <Download className="mr-2 size-3.5" /> Download report
        </Button>
      </div>
      <div className="max-h-48 overflow-auto rounded-2xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5">Sheet</th>
              <th className="px-2 py-1.5">Row</th>
              <th className="px-2 py-1.5">Field</th>
              <th className="px-2 py-1.5">Message</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1.5">{e.sheet}</td>
                <td className="px-2 py-1.5">{e.row || "—"}</td>
                <td className="px-2 py-1.5">{e.field}</td>
                <td className="px-2 py-1.5">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errors.length > shown.length && (
        <p className="text-xs text-muted-foreground">
          Showing first {shown.length}. Download the report for all{" "}
          {errors.length}.
        </p>
      )}
    </div>
  )
}
