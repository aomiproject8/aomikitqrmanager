"use client"

import {
  useActionState,
  useState,
  useTransition,
  useRef,
  useCallback,
} from "react"
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
import { ArrowUp, ArrowDown, X } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  uploadProductImage,
  deleteProductImage,
  reorderProductImages,
  type ImageActionState,
} from "../image-actions"

type ImageRow = {
  id: string
  imageUrl: string
  imageType: string
  sortOrder: number
}

type Props = {
  productId: string
  images: ImageRow[]
}

type PendingFile = {
  file: File
  previewUrl: string
  imageType: string
}

const IMAGE_TYPES = ["FRONT", "SECONDARY", "REFERENCE"] as const
const MAX_PENDING = 10

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ProductImages({ productId, images }: Props) {
  const uploadAction = uploadProductImage.bind(null, productId)
  const deleteAction = deleteProductImage.bind(null, productId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [, deleteFormAction, deleting] = useActionState<
    ImageActionState,
    FormData
  >(async (prev, fd) => {
    const res = await deleteAction(prev, fd)
    if (res.error) toast.error(res.error)
    else if (res.ok) toast.success("Image deleted")
    return res
  }, {})

  const [isReordering, startReorder] = useTransition()
  const [localOrder, setLocalOrder] = useState<ImageRow[]>(images)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  // Keep local order in sync after server revalidation.
  const serverIds = images.map((i) => i.id).join(",")
  const localIds = localOrder.map((i) => i.id).join(",")
  if (serverIds !== localIds) {
    setLocalOrder(images)
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...localOrder]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setLocalOrder(next)
    startReorder(async () => {
      const res = await reorderProductImages(
        productId,
        next.map((i) => i.id)
      )
      if (res.error) toast.error(res.error)
    })
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files ?? [])
      setPendingFiles((prev) => {
        const remaining = MAX_PENDING - prev.length
        const added = incoming.slice(0, remaining).map((file) => ({
          file,
          previewUrl: URL.createObjectURL(file),
          imageType: "REFERENCE",
        }))
        return [...prev, ...added]
      })
      // Reset so the same file can be picked again
      e.target.value = ""
    },
    []
  )

  function removePending(index: number) {
    setPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function setPendingType(index: number, imageType: string) {
    setPendingFiles((prev) =>
      prev.map((p, i) => (i === index ? { ...p, imageType } : p))
    )
  }

  async function uploadAll() {
    const total = pendingFiles.length
    for (let i = 0; i < total; i++) {
      setUploadingIndex(i)
      const { file, imageType } = pendingFiles[i]
      const fd = new FormData()
      fd.append("file", file)
      fd.append("imageType", imageType)
      const res = await uploadAction({}, fd)
      if (res.error) {
        toast.error(`${file.name}: ${res.error}`)
        setUploadingIndex(null)
        return
      }
    }
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPendingFiles([])
    setUploadingIndex(null)
    toast.success(total > 1 ? `${total} images uploaded` : "Image uploaded")
  }

  const uploading = uploadingIndex !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Images</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The first image is the primary (display) image.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {localOrder.length} uploaded
        </span>
      </div>

      {/* File picker */}
      <div className="form-section space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="file-picker">Add images (up to {MAX_PENDING})</Label>
          <input
            ref={fileInputRef}
            id="file-picker"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            disabled={uploading || pendingFiles.length >= MAX_PENDING}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted/80 disabled:opacity-50"
          />
        </div>

        {/* Pending previews */}
        {pendingFiles.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Ready to upload ({pendingFiles.length})
            </p>
            <ul className="space-y-2">
              {pendingFiles.map((pf, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pf.previewUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {pf.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(pf.file.size)}
                    </p>
                    <Select
                      value={pf.imageType}
                      onValueChange={(v) => setPendingType(index, v)}
                      disabled={uploading}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t.charAt(0) + t.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {uploading && uploadingIndex === index ? (
                    <span className="shrink-0 text-xs text-primary">
                      Uploading…
                    </span>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => removePending(index)}
                          disabled={uploading}
                          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          aria-label={`Remove ${pf.file.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>

            <Button
              type="button"
              onClick={uploadAll}
              disabled={uploading}
            >
              {uploading
                ? `Uploading ${uploadingIndex! + 1} of ${pendingFiles.length}…`
                : `Upload ${pendingFiles.length} image${pendingFiles.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </div>

      {/* Uploaded image grid */}
      {localOrder.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {localOrder.map((img, index) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5"
            >
              <div className="relative aspect-square w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt={`Product image ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <Badge variant="secondary">{img.imageType}</Badge>
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || isReordering}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {index === 0 ? "Already first" : "Move up"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === localOrder.length - 1 || isReordering}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {index === localOrder.length - 1 ? "Already last" : "Move down"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <form action={deleteFormAction} className="px-2 pb-2">
                <input type="hidden" name="imageId" value={img.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  disabled={deleting}
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Delete
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
