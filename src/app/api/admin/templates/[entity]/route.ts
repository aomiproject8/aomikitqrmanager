import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  buildProductsTemplate,
  buildDiagnosesTemplate,
  buildRoutineTypesTemplate,
  buildRoutinesTemplate,
} from "@/lib/server/excel/templates"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TEMPLATES: Record<
  string,
  { filename: string; build: () => Promise<Buffer> }
> = {
  products: {
    filename: "AOMI_PRODUCTS_TEMPLATE_V1.xlsx",
    build: buildProductsTemplate,
  },
  diagnoses: {
    filename: "AOMI_DIAGNOSES_TEMPLATE_V1.xlsx",
    build: buildDiagnosesTemplate,
  },
  "routine-types": {
    filename: "AOMI_ROUTINE_TYPES_TEMPLATE_V1.xlsx",
    build: buildRoutineTypesTemplate,
  },
  routines: {
    filename: "AOMI_ROUTINES_TEMPLATE_V1.xlsx",
    build: buildRoutinesTemplate,
  },
}

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  await requireRole("ADMIN")

  const { entity } = await params
  const template = TEMPLATES[entity]
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 })
  }

  const buffer = await template.build()
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${template.filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
