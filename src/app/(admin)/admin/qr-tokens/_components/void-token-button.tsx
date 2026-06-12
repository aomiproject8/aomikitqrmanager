"use client"

import { useActionState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { voidToken, type TokenActionState } from "../actions"

export default function VoidTokenButton({ id }: { id: string }) {
  const [, formAction, pending] = useActionState<TokenActionState, FormData>(
    async (prev, fd) => {
      const res = await voidToken(prev, fd)
      if (res.error) toast.error(res.error)
      else if (res.ok) toast.success("Token voided")
      return res
    },
    {}
  )

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Void this token? This cannot be undone.")) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="text-red-600 hover:text-red-700 dark:text-red-400"
      >
        {pending ? "Voiding…" : "Void"}
      </Button>
    </form>
  )
}
