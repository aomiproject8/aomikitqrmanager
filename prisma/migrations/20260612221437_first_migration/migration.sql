-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SELLER');

-- CreateEnum
CREATE TYPE "QRTokenStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ACTIVATED', 'VOIDED', 'REPLACED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('ASSIGNED', 'ACTIVATED', 'VOIDED', 'REPLACED');

-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('FRONT', 'SECONDARY', 'REFERENCE');

-- CreateEnum
CREATE TYPE "BatchSource" AS ENUM ('GENERATED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "StepType" AS ENUM ('CLEANSER', 'TONER', 'SERUM', 'CREAM', 'SUNSCREEN', 'EXFOLIANT', 'TREATMENT', 'MOISTURIZER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'SELLER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "functionDescription" TEXT,
    "stepType" "StepType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageType" "ImageType" NOT NULL DEFAULT 'REFERENCE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER,
    "routineTypeId" TEXT NOT NULL,
    "generalInstructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_template_diagnoses" (
    "routineTemplateId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,

    CONSTRAINT "routine_template_diagnoses_pkey" PRIMARY KEY ("routineTemplateId","diagnosisId")
);

-- CreateTable
CREATE TABLE "routine_template_steps" (
    "id" TEXT NOT NULL,
    "routineTemplateId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepType" "StepType" NOT NULL,
    "defaultProductId" TEXT,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routine_template_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_replacements" (
    "id" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "replacementProductId" TEXT NOT NULL,
    "stepType" "StepType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_replacements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_token_batches" (
    "id" TEXT NOT NULL,
    "batchName" TEXT,
    "prefix" TEXT NOT NULL DEFAULT 'AOMI-KIT',
    "quantity" INTEGER NOT NULL,
    "source" "BatchSource" NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_token_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "batchId" TEXT,
    "status" "QRTokenStatus" NOT NULL DEFAULT 'AVAILABLE',
    "generatedByUserId" TEXT,
    "importedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "qrTokenId" TEXT NOT NULL,
    "routineTemplateId" TEXT NOT NULL,
    "status" "PackageStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_products" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "routineTemplateStepId" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "stepType" "StepType" NOT NULL,
    "productId" TEXT NOT NULL,
    "originalProductId" TEXT,
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activation_events" (
    "id" TEXT NOT NULL,
    "qrTokenId" TEXT NOT NULL,
    "packageId" TEXT,
    "externalUserId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_stepType_active_idx" ON "products"("stepType", "active");

-- CreateIndex
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "diagnoses_slug_key" ON "diagnoses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "routine_types_slug_key" ON "routine_types"("slug");

-- CreateIndex
CREATE INDEX "routine_templates_routineTypeId_active_idx" ON "routine_templates"("routineTypeId", "active");

-- CreateIndex
CREATE INDEX "routine_template_diagnoses_diagnosisId_idx" ON "routine_template_diagnoses"("diagnosisId");

-- CreateIndex
CREATE UNIQUE INDEX "routine_template_steps_routineTemplateId_stepNumber_key" ON "routine_template_steps"("routineTemplateId", "stepNumber");

-- CreateIndex
CREATE INDEX "product_replacements_sourceProductId_active_idx" ON "product_replacements"("sourceProductId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "product_replacements_sourceProductId_replacementProductId_key" ON "product_replacements"("sourceProductId", "replacementProductId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tokens_token_key" ON "qr_tokens"("token");

-- CreateIndex
CREATE INDEX "qr_tokens_status_idx" ON "qr_tokens"("status");

-- CreateIndex
CREATE INDEX "qr_tokens_batchId_idx" ON "qr_tokens"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "packages_qrTokenId_key" ON "packages"("qrTokenId");

-- CreateIndex
CREATE INDEX "package_products_packageId_idx" ON "package_products"("packageId");

-- CreateIndex
CREATE INDEX "activation_events_qrTokenId_idx" ON "activation_events"("qrTokenId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_templates" ADD CONSTRAINT "routine_templates_routineTypeId_fkey" FOREIGN KEY ("routineTypeId") REFERENCES "routine_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_diagnoses" ADD CONSTRAINT "routine_template_diagnoses_routineTemplateId_fkey" FOREIGN KEY ("routineTemplateId") REFERENCES "routine_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_diagnoses" ADD CONSTRAINT "routine_template_diagnoses_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "diagnoses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_steps" ADD CONSTRAINT "routine_template_steps_routineTemplateId_fkey" FOREIGN KEY ("routineTemplateId") REFERENCES "routine_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_template_steps" ADD CONSTRAINT "routine_template_steps_defaultProductId_fkey" FOREIGN KEY ("defaultProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_replacements" ADD CONSTRAINT "product_replacements_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_replacements" ADD CONSTRAINT "product_replacements_replacementProductId_fkey" FOREIGN KEY ("replacementProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "qr_token_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "qr_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_routineTemplateId_fkey" FOREIGN KEY ("routineTemplateId") REFERENCES "routine_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_products" ADD CONSTRAINT "package_products_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activation_events" ADD CONSTRAINT "activation_events_qrTokenId_fkey" FOREIGN KEY ("qrTokenId") REFERENCES "qr_tokens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
