#!/bin/sh
set -e

echo "🚀 Starting WhatsApp Agent SaaS..."

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy || echo "❌ Prisma migration failed but bypassing crash..."

echo "✅ Starting Next.js server..."
exec node server.js
