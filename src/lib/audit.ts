import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"

export async function writeAuditLog(
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonObject
) {
  await prisma.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      metadataJson: metadata,
    },
  })
}
