-- CreateEnum
CREATE TYPE "KindergartenDocumentType" AS ENUM ('DAILY_CARE_SHEET', 'WEEKLY_MENU');

-- CreateTable
CREATE TABLE "KindergartenDocument" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "KindergartenDocumentType" NOT NULL,
    "periodStart" DATE NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KindergartenDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KindergartenDocument_storageKey_key" ON "KindergartenDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "KindergartenDocument_householdId_childId_type_periodStart_key" ON "KindergartenDocument"("householdId", "childId", "type", "periodStart");

-- CreateIndex
CREATE INDEX "KindergartenDocument_householdId_childId_type_periodStart_idx" ON "KindergartenDocument"("householdId", "childId", "type", "periodStart");

-- AddForeignKey
ALTER TABLE "KindergartenDocument" ADD CONSTRAINT "KindergartenDocument_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KindergartenDocument" ADD CONSTRAINT "KindergartenDocument_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
