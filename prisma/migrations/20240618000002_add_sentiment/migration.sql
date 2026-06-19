-- Add sentiment fields to Conversation
ALTER TABLE "conversations" ADD COLUMN "sentiment" TEXT DEFAULT 'NEUTRAL';
ALTER TABLE "conversations" ADD COLUMN "is_high_priority" BOOLEAN NOT NULL DEFAULT false;
