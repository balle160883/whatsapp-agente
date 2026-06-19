-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED');

-- CreateEnum
CREATE TYPE "NpsCategory" AS ENUM ('PROMOTER', 'PASSIVE', 'DETRACTOR');

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "appointment_id" UUID,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "comment" TEXT,
    "nps_category" "NpsCategory",
    "sentiment" TEXT,
    "is_high_priority" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_appointment_id_key" ON "feedbacks"("appointment_id");

-- CreateIndex
CREATE INDEX "feedbacks_organization_id_idx" ON "feedbacks"("organization_id");

-- CreateIndex
CREATE INDEX "feedbacks_organization_id_status_idx" ON "feedbacks"("organization_id", "status");

-- CreateIndex
CREATE INDEX "feedbacks_organization_id_is_high_priority_idx" ON "feedbacks"("organization_id", "is_high_priority");

-- CreateIndex
CREATE INDEX "feedbacks_contact_id_idx" ON "feedbacks"("contact_id");

-- CreateIndex
CREATE INDEX "feedbacks_appointment_id_idx" ON "feedbacks"("appointment_id");

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
