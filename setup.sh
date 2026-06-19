#!/bin/bash
set -e

echo "🔧 Setup inicial de WhatsApp Agente SaaS"
echo "========================================"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "📋 Copiando .env.example a .env..."
  cp .env.example .env

  # Generate ENCRYPTION_KEY
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  NEXTAUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")

  # Replace in .env
  sed -i "s/0000000000000000000000000000000000000000000000000000000000000000/$ENCRYPTION_KEY/" .env
  sed -i "s/change-this-to-a-random-secret-min-32-chars/$NEXTAUTH_SECRET/" .env

  echo "✅ Claves de seguridad generadas automáticamente"
  echo "⚠️  Edita .env con tus credenciales antes de continuar"
else
  echo "✅ .env ya existe"
fi

echo ""
echo "🐳 Levantando servicios con Docker Compose..."
docker compose up -d postgres redis

echo ""
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

echo ""
echo "📦 Ejecutando migraciones de base de datos..."
docker compose run --rm app npx prisma migrate deploy

echo ""
echo "🚀 Iniciando aplicación..."
docker compose up -d app

echo ""
echo "✅ ¡WhatsApp Agente está corriendo en http://localhost:3000!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Abre http://localhost:3000/signup para crear tu cuenta"
echo "   2. Ve a /integraciones para configurar WhatsApp y Google Calendar"
echo "   3. Configura tu proveedor de IA (OpenAI / Gemini / Custom)"
