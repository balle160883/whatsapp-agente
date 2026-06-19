-- Add reminderSent and reminderSentAt to Appointment
ALTER TABLE "appointments" ADD COLUMN "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "appointments" ADD COLUMN "reminder_sent_at" TIMESTAMP(3);

-- Add reminderMinutes to AgentConfig with default value of 60
ALTER TABLE "agent_configs" ADD COLUMN "reminder_minutes" INTEGER NOT NULL DEFAULT 60;
