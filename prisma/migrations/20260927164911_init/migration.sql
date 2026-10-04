-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEVELOPER', 'DESIGNER', 'CONSULTANT', 'AGENCY', 'FREELANCER', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('INSTAGRAM', 'LINKEDIN', 'X', 'COLD_EMAIL', 'REFERRALS', 'FREELANCE_PLATFORMS', 'NETWORKING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferralSource" AS ENUM ('X', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE', 'FRIEND', 'PRODUCT_HUNT', 'RECOMMENDATION', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole",
    "clientSources" "ClientSource"[],
    "referralSource" "ReferralSource",
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
