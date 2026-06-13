import { redirect } from "next/navigation"

export default function GenerateRedirectPage() {
  redirect("/admin/qr-tokens?generate=true")
}
