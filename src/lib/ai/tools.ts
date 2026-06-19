import type { Tool } from '@/lib/ai/ai-provider'

export const AGENT_TOOLS: Tool[] = [
  {
    name: 'get_available_slots',
    description:
      'Obtiene los horarios disponibles para agendar una cita en el calendario de la organización.',
    parameters: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'El servicio o tipo de cita que el cliente desea.',
        },
        days_ahead: {
          type: 'number',
          description: 'Cuántos días hacia adelante buscar disponibilidad. Por defecto 7.',
        },
      },
      required: ['service'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Reserva una cita en el calendario para el cliente con los datos proporcionados.',
    parameters: {
      type: 'object',
      properties: {
        full_name: {
          type: 'string',
          description: 'Nombre completo del cliente.',
        },
        service: {
          type: 'string',
          description: 'Servicio o tipo de cita a agendar.',
        },
        starts_at: {
          type: 'string',
          description:
            'Fecha y hora de inicio de la cita en formato ISO 8601 (ej. 2024-01-15T10:00:00).',
        },
        is_new_patient: {
          type: 'boolean',
          description: 'Indica si el cliente es nuevo (true) o ya es cliente existente (false).',
        },
      },
      required: ['full_name', 'service', 'starts_at', 'is_new_patient'],
    },
  },
  {
    name: 'save_contact_info',
    description: 'Guarda o actualiza la información de contacto del cliente en el sistema.',
    parameters: {
      type: 'object',
      properties: {
        full_name: {
          type: 'string',
          description: 'Nombre completo del cliente.',
        },
        is_new_patient: {
          type: 'boolean',
          description: 'Indica si es un cliente nuevo.',
        },
      },
      required: ['full_name', 'is_new_patient'],
    },
  },
  {
    name: 'request_human_handoff',
    description:
      'Solicita la transferencia de la conversación a un agente humano y desactiva el bot para esta conversación.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Razón por la que se solicita la transferencia a un humano.',
        },
      },
      required: ['reason'],
    },
  },
]
