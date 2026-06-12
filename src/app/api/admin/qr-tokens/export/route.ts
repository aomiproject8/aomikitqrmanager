import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma, QRTokenStatus } from "@/generated/prisma/client"

const STATUSES: QRTokenStatus[] = [
  "AVAILABLE",
  "ASSIGNED",
  "ACTIVATED",
  "VOIDED",
  "REPLACED",
]

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const batch = searchParams.get("batch")

  const where: Prisma.QRTokenWhereInput = {}
  if (status && STATUSES.includes(status as QRTokenStatus)) {
    where.status = status as QRTokenStatus
  }
  if (batch) where.batchId = batch

  const tokens = await prisma.qRToken.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      token: true,
      status: true,
      batchId: true,
      createdAt: true,
    },
  })

  const header = "token,status,batchId,createdAt"
  const rows = tokens.map((t) =>
    [
      csvEscape(t.token),
      csvEscape(t.status),
      csvEscape(t.batchId ?? ""),
      csvEscape(t.createdAt.toISOString()),
    ].join(",")
  )
  const csv = [header, ...rows].join("\n")

  const filename = `qr-tokens-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
