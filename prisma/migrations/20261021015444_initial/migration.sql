-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MANUAL', 'HOME', 'HOSPITAL', 'KINDERGARTEN', 'IMPORT');

-- CreateEnum
CREATE TYPE "SleepKind" AS ENUM ('NIGHT', 'NAP');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'OTHER');

-- CreateEnum
CREATE TYPE "BeverageType" AS ENUM ('MILK', 'WATER', 'YOGURT_DRINK', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityIntensity" AS ENUM ('LIGHT', 'MODERATE', 'VIGOROUS');

-- CreateEnum
CREATE TYPE "ActivityStructure" AS ENUM ('FREE_PLAY', 'STRUCTURED', 'MIXED');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('HAPPY', 'CALM', 'ANXIOUS', 'SAD', 'ANGRY', 'MIXED', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'UNSPECIFIED',
    "birthHeightCm" DECIMAL(5,2),
    "birthWeightKg" DECIMAL(5,3),
    "motherHeightCm" DECIMAL(5,2),
    "fatherHeightCm" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMeasurement" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "heightCm" DECIMAL(5,2),
    "weightKg" DECIMAL(5,3),
    "headCircumferenceCm" DECIMAL(5,2),
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "place" TEXT,
    "method" TEXT,
    "device" TEXT,
    "precisionNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GrowthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepSession" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "kind" "SleepKind" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "awakeMinutes" INTEGER,
    "wakeCount" INTEGER,
    "observation" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SleepSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "appetite" TEXT,
    "notes" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "offeredAmount" DECIMAL(8,2),
    "consumedAmount" DECIMAL(8,2),
    "estimatedAmount" DECIMAL(8,2),
    "amountUnit" TEXT,
    "isNewFood" BOOLEAN NOT NULL DEFAULT false,
    "reactionNote" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeverageIntake" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "type" "BeverageType" NOT NULL,
    "volumeMl" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BeverageIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalActivity" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "outdoorMinutes" INTEGER,
    "intensity" "ActivityIntensity" NOT NULL,
    "structure" "ActivityStructure" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "engagement" TEXT,
    "notes" TEXT,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PhysicalActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionRecord" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "mood" "Mood" NOT NULL,
    "tags" TEXT[],
    "context" TEXT,
    "durationMinutes" INTEGER,
    "peerInteraction" TEXT,
    "parentInteraction" TEXT,
    "notes" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EmotionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "tokenDigest" TEXT NOT NULL,
    "csrfTokenDigest" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Child_householdId_deletedAt_idx" ON "Child"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "Child_householdId_birthDate_idx" ON "Child"("householdId", "birthDate");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_householdId_childId_measuredAt_idx" ON "GrowthMeasurement"("householdId", "childId", "measuredAt");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_householdId_deletedAt_idx" ON "GrowthMeasurement"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "SleepSession_householdId_childId_startedAt_idx" ON "SleepSession"("householdId", "childId", "startedAt");

-- CreateIndex
CREATE INDEX "SleepSession_householdId_deletedAt_idx" ON "SleepSession"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "Meal_householdId_childId_occurredAt_idx" ON "Meal"("householdId", "childId", "occurredAt");

-- CreateIndex
CREATE INDEX "Meal_householdId_deletedAt_idx" ON "Meal"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "MealItem_householdId_mealId_deletedAt_idx" ON "MealItem"("householdId", "mealId", "deletedAt");

-- CreateIndex
CREATE INDEX "BeverageIntake_householdId_childId_occurredAt_idx" ON "BeverageIntake"("householdId", "childId", "occurredAt");

-- CreateIndex
CREATE INDEX "BeverageIntake_householdId_deletedAt_idx" ON "BeverageIntake"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "PhysicalActivity_householdId_childId_occurredAt_idx" ON "PhysicalActivity"("householdId", "childId", "occurredAt");

-- CreateIndex
CREATE INDEX "PhysicalActivity_householdId_deletedAt_idx" ON "PhysicalActivity"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "EmotionRecord_householdId_childId_occurredAt_idx" ON "EmotionRecord"("householdId", "childId", "occurredAt");

-- CreateIndex
CREATE INDEX "EmotionRecord_householdId_deletedAt_idx" ON "EmotionRecord"("householdId", "deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_householdId_entityType_entityId_createdAt_idx" ON "AuditLog"("householdId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_householdId_createdAt_idx" ON "AuditLog"("householdId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenDigest_key" ON "AdminSession"("tokenDigest");

-- CreateIndex
CREATE INDEX "AdminSession_householdId_expiresAt_idx" ON "AdminSession"("householdId", "expiresAt");

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSession" ADD CONSTRAINT "SleepSession_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepSession" ADD CONSTRAINT "SleepSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeverageIntake" ADD CONSTRAINT "BeverageIntake_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeverageIntake" ADD CONSTRAINT "BeverageIntake_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalActivity" ADD CONSTRAINT "PhysicalActivity_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalActivity" ADD CONSTRAINT "PhysicalActivity_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionRecord" ADD CONSTRAINT "EmotionRecord_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionRecord" ADD CONSTRAINT "EmotionRecord_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
