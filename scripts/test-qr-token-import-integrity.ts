import "dotenv/config"
import crypto from "crypto"
import { prisma } from "../src/lib/prisma"
import { processQRTokenImport } from "../src/lib/server/import-qr-tokens"
import { QRTokenStatus } from "../src/generated/prisma/client"

async function runTests() {
  const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`.toUpperCase()
  const prefix = `AOMI-REGRESSION-${runId}-`
  const batchNamePrefix = `Batch-${runId}-`
  
  // Use the first available admin user for the tests
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
  if (!adminUser) throw new Error("No admin user found")
  const userId = adminUser.id

  let exitCode = 0

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`)
      exitCode = 1
    } else {
      console.log(`✅ PASS: ${message}`)
    }
  }

  try {
    console.log(`\nStarting Test Run: ${runId}\n`)

    // TEST A: Initial Import (6 rows, 4 unique tokens)
    console.log("=== TEST A: Initial Import ===")
    const csvTextA = `token
${prefix}0001
${prefix}0002
${prefix}0001
${prefix}0003
${prefix}0002
${prefix}0004`
    
    const resultA = await processQRTokenImport({ csvText: csvTextA, batchName: `${batchNamePrefix}A`, userId })
    assert(resultA.totalRows === 6, "Test A: totalRows is 6")
    assert(resultA.inserted === 4, "Test A: inserted is 4")
    assert(resultA.skippedDuplicate === 2, "Test A: skippedDuplicate is 2")
    assert(resultA.invalid === 0, "Test A: invalid is 0")

    const tokensA = await prisma.qRToken.findMany({ where: { token: { startsWith: prefix } }, include: { batch: true } })
    assert(tokensA.length === 4, "Test A: 4 tokens created")
    
    const batchAId = tokensA[0]?.batchId
    assert(!!batchAId, "Test A: Batch A created")
    const batchA = await prisma.qRTokenBatch.findUnique({ where: { id: batchAId! } })
    assert(batchA?.quantity === 4, "Test A: Batch A quantity is 4")

    // TEST B: Identical Reimport
    console.log("\n=== TEST B: Identical Reimport ===")
    const resultB = await processQRTokenImport({ csvText: csvTextA, batchName: `${batchNamePrefix}B`, userId })
    assert(resultB.inserted === 0, "Test B: inserted is 0")
    assert(resultB.skippedDuplicate === 6, "Test B: skippedDuplicate is 6")
    
    const tokensB = await prisma.qRToken.findMany({ where: { token: { startsWith: prefix } }, include: { batch: true } })
    assert(tokensB.length === 4, "Test B: No additional token rows")
    assert(tokensB.every(t => t.batchId === batchAId), "Test B: original batch IDs unchanged")
    
    const batchB = await prisma.qRTokenBatch.findFirst({ where: { batchName: `${batchNamePrefix}B` } })
    assert(!batchB, "Test B: No new batch created")

    // TEST C: Mixed existing and new values
    console.log("\n=== TEST C: Mixed existing and new values ===")
    const csvTextC = `token
${prefix}0003
${prefix}0004
${prefix}0005
${prefix}0006`
    
    const resultC = await processQRTokenImport({ csvText: csvTextC, batchName: `${batchNamePrefix}C`, userId })
    assert(resultC.totalRows === 4, "Test C: totalRows is 4")
    assert(resultC.inserted === 2, "Test C: inserted is 2")
    assert(resultC.skippedDuplicate === 2, "Test C: skippedDuplicate is 2")

    const tokensC_existing = await prisma.qRToken.findMany({ where: { token: { in: [`${prefix}0003`, `${prefix}0004`] } } })
    assert(tokensC_existing.every(t => t.batchId === batchAId), "Test C: existing tokens retain original batch")

    const tokensC_new = await prisma.qRToken.findMany({ where: { token: { in: [`${prefix}0005`, `${prefix}0006`] } }, include: { batch: true } })
    assert(tokensC_new.length === 2, "Test C: new tokens created")
    
    const batchCId = tokensC_new[0]?.batchId
    assert(!!batchCId && batchCId !== batchAId, "Test C: new batch created for new tokens")
    const batchC = await prisma.qRTokenBatch.findUnique({ where: { id: batchCId! } })
    assert(batchC?.quantity === 2, "Test C: new batch quantity equals its actual token count")

    // TEST D: Invalid-only input
    console.log("\n=== TEST D: Invalid-only input ===")
    const csvTextD = `token
INVALID_TOKEN_#1
TOO_SHORT`
    const resultD = await processQRTokenImport({ csvText: csvTextD, batchName: `${batchNamePrefix}D`, userId })
    assert(resultD.totalRows === 2, "Test D: totalRows is 2")
    assert(resultD.invalid === 2, "Test D: invalid is 2")
    assert(resultD.inserted === 0, "Test D: inserted is 0")
    
    const batchD = await prisma.qRTokenBatch.findFirst({ where: { batchName: `${batchNamePrefix}D` } })
    assert(!batchD, "Test D: no batch created")

    // TEST E: Concurrent identical imports
    console.log("\n=== TEST E: Concurrent identical imports ===")
    const csvTextE = `token
${prefix}1001
${prefix}1002
${prefix}1003`

    const [resultE1, resultE2] = await Promise.all([
      processQRTokenImport({ csvText: csvTextE, batchName: `${batchNamePrefix}E1`, userId }),
      processQRTokenImport({ csvText: csvTextE, batchName: `${batchNamePrefix}E2`, userId })
    ])
    
    const sumInserted = resultE1.inserted + resultE2.inserted
    assert(sumInserted === 3, "Test E: total inserted across both requests is exactly 3")
    
    const sumSkipped = resultE1.skippedDuplicate + resultE2.skippedDuplicate
    assert(sumSkipped === 3, "Test E: total skipped across both requests is exactly 3")
    
    const tokensE = await prisma.qRToken.findMany({ where: { token: { in: [`${prefix}1001`, `${prefix}1002`, `${prefix}1003`] } } })
    assert(tokensE.length === 3, "Test E: one database row per unique token value")
    
    const batchE1 = await prisma.qRTokenBatch.findFirst({ where: { batchName: `${batchNamePrefix}E1` } })
    const batchE2 = await prisma.qRTokenBatch.findFirst({ where: { batchName: `${batchNamePrefix}E2` } })
    
    if (batchE1) {
      assert(batchE1.quantity > 0, "Test E: surviving batch E1 quantity > 0")
      const countE1 = await prisma.qRToken.count({ where: { batchId: batchE1.id } })
      assert(batchE1.quantity === countE1, "Test E: surviving batch E1 quantity equals actual count")
    }
    if (batchE2) {
      assert(batchE2.quantity > 0, "Test E: surviving batch E2 quantity > 0")
      const countE2 = await prisma.qRToken.count({ where: { batchId: batchE2.id } })
      assert(batchE2.quantity === countE2, "Test E: surviving batch E2 quantity equals actual count")
    }
    assert(!(batchE1 && batchE2), "Test E: no surviving empty batch")

    // TEST F: Lifecycle preservation
    console.log("\n=== TEST F: Lifecycle preservation ===")
    const csvTextF = `token
${prefix}2001`
    await processQRTokenImport({ csvText: csvTextF, batchName: `${batchNamePrefix}F`, userId })
    const tokenF = await prisma.qRToken.findUnique({ where: { token: `${prefix}2001` } })
    assert(!!tokenF, "Test F: token created")
    
    // Create temporary run-specific replacement token
    const csvTextFReplacement = `token
${prefix}2002`
    await processQRTokenImport({ csvText: csvTextFReplacement, batchName: `${batchNamePrefix}FRepl`, userId })
    const tokenReplacement = await prisma.qRToken.findUnique({ where: { token: `${prefix}2002` } })
    assert(!!tokenReplacement, "Test F: replacement token created")

    // Create temporary run-specific RoutineType & RoutineTemplate
    const routineTypeId = `RT-${runId}`.toLowerCase()
    const routineTemplateId = `TMPL-${runId}`.toLowerCase()
    
    await prisma.routineType.create({
      data: {
        id: routineTypeId,
        name: `Test Routine Type ${runId}`,
        slug: `test-routine-type-${runId.toLowerCase()}`,
        active: true
      }
    })
    
    await prisma.routineTemplate.create({
      data: {
        id: routineTemplateId,
        name: `Test Routine Template ${runId}`,
        routineTypeId,
        active: true
      }
    })

    // Setup lifecycle fields
    const assignedAt = new Date("2025-01-01T10:00:00Z")
    const activatedAt = new Date("2025-01-01T12:00:00Z")
    const voidedAt = new Date("2025-01-01T14:00:00Z")
    
    await prisma.qRToken.update({
      where: { id: tokenF!.id },
      data: {
        status: QRTokenStatus.ACTIVATED,
        assignedAt,
        activatedAt,
        voidedAt,
        replacedByTokenId: tokenReplacement!.id,
        notes: "Test mutation",
        generatedByUserId: userId,
        importedByUserId: userId,
      }
    })

    // Create Package assignment snapshot
    const packageId = `PKG-${runId}`.toLowerCase()
    await prisma.package.create({
      data: {
        id: packageId,
        qrTokenId: tokenF!.id,
        routineTemplateId,
        status: "ASSIGNED",
        createdByUserId: userId,
      }
    })

    // Create ActivationEvent
    const eventId = `EV-${runId}`.toLowerCase()
    await prisma.activationEvent.create({
      data: {
        id: eventId,
        qrTokenId: tokenF!.id,
        packageId,
        eventType: "TEST_EVENT",
        metadataJson: { foo: "bar" }
      }
    })

    // Perform reimport
    await processQRTokenImport({ csvText: csvTextF, batchName: `${batchNamePrefix}F2`, userId })
    
    // Verify everything is preserved
    const tokenF_after = await prisma.qRToken.findUnique({
      where: { token: `${prefix}2001` },
      include: {
        package: true,
        events: true,
      }
    })
    
    assert(!!tokenF_after, "Test F: tokenF_after exists")
    assert(tokenF_after?.id === tokenF!.id, "Test F: token ID unchanged")
    assert(tokenF_after?.token === tokenF!.token, "Test F: token value unchanged")
    assert(tokenF_after?.batchId === tokenF!.batchId, "Test F: batch ID unchanged")
    assert(tokenF_after?.status === QRTokenStatus.ACTIVATED, "Test F: status unchanged")
    assert(tokenF_after?.generatedByUserId === userId, "Test F: generatedByUserId unchanged")
    assert(tokenF_after?.importedByUserId === userId, "Test F: importedByUserId unchanged")
    assert(tokenF_after?.assignedAt?.getTime() === assignedAt.getTime(), "Test F: assignedAt unchanged")
    assert(tokenF_after?.activatedAt?.getTime() === activatedAt.getTime(), "Test F: activatedAt unchanged")
    assert(tokenF_after?.voidedAt?.getTime() === voidedAt.getTime(), "Test F: voidedAt unchanged")
    assert(tokenF_after?.replacedByTokenId === tokenReplacement!.id, "Test F: replacedByTokenId unchanged")
    assert(tokenF_after?.notes === "Test mutation", "Test F: notes unchanged")
    
    assert(!!tokenF_after?.package, "Test F: package relation exists")
    assert(tokenF_after?.package?.id === packageId, "Test F: package relation ID unchanged")
    assert(tokenF_after?.package?.routineTemplateId === routineTemplateId, "Test F: package template ID unchanged")
    
    assert(tokenF_after?.events.length === 1, "Test F: activation events relation count unchanged")
    assert(tokenF_after?.events[0]?.id === eventId, "Test F: activation event ID unchanged")

  } catch (error) {
    console.error("Test execution failed with error:", error)
    exitCode = 1
  } finally {
    console.log("\n=== Cleanup ===")
    
    // 1. Delete run-specific activation events
    const deleteEvents = await prisma.activationEvent.deleteMany({
      where: {
        OR: [
          { qrToken: { token: { startsWith: prefix } } },
          { id: { startsWith: `ev-${runId}`.toLowerCase() } }
        ]
      }
    })
    console.log(`Deleted ${deleteEvents.count} test activation events.`)

    // 2. Delete run-specific packages
    const deletePackages = await prisma.package.deleteMany({
      where: {
        OR: [
          { qrToken: { token: { startsWith: prefix } } },
          { id: { startsWith: `pkg-${runId}`.toLowerCase() } }
        ]
      }
    })
    console.log(`Deleted ${deletePackages.count} test packages.`)

    // 3. Delete run-specific tokens
    const deleteTokens = await prisma.qRToken.deleteMany({
      where: { token: { startsWith: prefix } }
    })
    console.log(`Deleted ${deleteTokens.count} test tokens.`)
    
    // 4. Delete run-specific routine templates
    const deleteTemplates = await prisma.routineTemplate.deleteMany({
      where: { id: { startsWith: `tmpl-${runId}`.toLowerCase() } }
    })
    console.log(`Deleted ${deleteTemplates.count} test templates.`)

    // 5. Delete run-specific routine types
    const deleteTypes = await prisma.routineType.deleteMany({
      where: { id: { startsWith: `rt-${runId}`.toLowerCase() } }
    })
    console.log(`Deleted ${deleteTypes.count} test routine types.`)

    // 6. Delete run-specific batches
    const deleteBatches = await prisma.qRTokenBatch.deleteMany({
      where: { batchName: { startsWith: batchNamePrefix } }
    })
    console.log(`Deleted ${deleteBatches.count} test batches.`)
    
    console.log("Cleanup complete.")
  }

  if (exitCode !== 0) {
    console.error("\n❌ TESTS FAILED")
  } else {
    console.log("\n🎉 ALL TESTS PASSED")
  }
  process.exit(exitCode)
}

runTests()
