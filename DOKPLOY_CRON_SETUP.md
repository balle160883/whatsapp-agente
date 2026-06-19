# Configuración de Cron Jobs en Dokploy

## Recordatorios Automáticos de Citas

Para enviar recordatorios automáticos según la configuración del cliente (en minutos antes de la cita), configura un Cron Job en Dokploy:

### Pasos:

1. Ve a tu aplicación en Dokploy
2. Haz clic en la sección **Cron Jobs**
3. Crea un nuevo Cron Job:
   - **Nombre**: Enviar Recordatorios de Citas
   - **Schedule**: `*/5 * * * *` (cada 5 minutos - ajusta según tus necesidades)
   - **Comando**:
     ```bash
     curl -X POST http://localhost:3000/api/cron/reminders
     ```

## Funcionamiento:

- El cron job llamará al endpoint `/api/cron/reminders` cada 5 minutos
- El endpoint buscará todas las citas próximas (según la configuración `reminderMinutes`)
- Enviará el recordatorio automático por WhatsApp y marcará la cita como `reminderSent = true`

## Otras Frecuencias:

- Cada minuto: `* * * * *`
- Cada 10 minutos: `*/10 * * * *`
- Cada hora: `0 * * * *`
