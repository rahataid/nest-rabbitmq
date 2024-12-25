-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_email_key" ON "beneficiaries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_phone_key" ON "beneficiaries"("phone");
