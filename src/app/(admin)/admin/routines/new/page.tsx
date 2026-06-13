import { redirect } from "next/navigation"

export default function NewRoutineRedirectPage() {
  redirect("/admin/routines?new=true")
}
