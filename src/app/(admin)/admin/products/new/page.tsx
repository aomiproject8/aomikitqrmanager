import { redirect } from "next/navigation"

export default function NewProductRedirectPage() {
  redirect("/admin/products?new=true")
}
