/*
  Warnings:

  - The `sentiment` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "feedbacks" DROP CONSTRAINT "feedbacks_contact_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_conversation_id_fkey";

-- AlterTable
ALTER TABLE "agent_configs" ADD COLUMN     "nps_survey_message" TEXT NOT NULL DEFAULT '¡Hola! Esperamos que hayas tenido una excelente experiencia. 🌟

Por favor, califica tu servicio de 0 a 5 estrellas:

1️⃣ - Muy malo
2️⃣ - Malo
3️⃣ - Regular
4️⃣ - Bueno
5️⃣ - Excelente

También puedes dejar un comentario si lo deseas. ¡Gracias por tu feedback!',
ADD COLUMN     "reminder_message" TEXT NOT NULL DEFAULT '¡Hola {{nombre}}! 📅

Te recordamos tu cita:

Servicio: {{servicio}}
Fecha y hora: {{fecha_hora}}

¿Quieres confirmar tu asistencia, reprogramar o cancelar?

1️⃣ Confirmar
2️⃣ Reprogramar
3️⃣ Cancelar',
ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "appointments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "audit_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "sentiment",
ADD COLUMN     "sentiment" "Sentiment" DEFAULT 'NEUTRAL';

-- AlterTable
ALTER TABLE "google_calendar_configs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "whatsapp_configs" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "conversations_organization_id_is_high_priority_idx" ON "conversations"("organization_id", "is_high_priority");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
