CREATE TYPE "Urgency" AS ENUM ('Mild', 'Moderate', 'Urgent', 'Emergency');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "symptoms" TEXT NOT NULL,
  "issueDetails" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "age" INTEGER NOT NULL,
  "medicalHistory" TEXT,
  "possibleIssues" JSONB NOT NULL,
  "urgency" "Urgency" NOT NULL,
  "redFlags" JSONB NOT NULL,
  "suggestions" JSONB NOT NULL,
  "followUpQuestions" JSONB NOT NULL,
  "recommendedSpecialist" TEXT NOT NULL,
  "needsMedicalAttention" BOOLEAN NOT NULL,
  "disclaimer" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HospitalSearch" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "specialty" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HospitalSearch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Assessment_userId_createdAt_idx" ON "Assessment"("userId", "createdAt");
CREATE INDEX "HospitalSearch_userId_createdAt_idx" ON "HospitalSearch"("userId", "createdAt");

ALTER TABLE "Assessment"
  ADD CONSTRAINT "Assessment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
