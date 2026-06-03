import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { safeDecrypt, encrypt } from "@/lib/encryption";
import { addDays, addHours, startOfDay, format } from "date-fns";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
];

interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  start: Date;
  end: Date;
}

interface TimeSlot {
  start: string;
  end: string;
  display: string;
}

interface CreateEventInput {
  summary: string;
  start: Date;
  end: Date;
  description?: string;
}

export class CalendarService {
  private auth: OAuth2Client;
  private calendar: ReturnType<typeof google.calendar>;
  private calendarId: string;
  private organizationId: string;

  constructor(
    auth: OAuth2Client,
    calendarId: string,
    organizationId: string
  ) {
    this.auth = auth;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.calendar = google.calendar({ version: "v3", auth: auth as any });
    this.calendarId = calendarId;
    this.organizationId = organizationId;
  }

  async getAvailableSlots(service: string, daysAhead = 7): Promise<TimeSlot[]> {
    const timeMin = new Date();
    const timeMax = addDays(timeMin, daysAhead);

    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: this.calendarId }],
      },
    });

    const busyPeriods =
      response.data.calendars?.[this.calendarId]?.busy ?? [];

    const slots: TimeSlot[] = [];
    for (let d = 0; d < daysAhead; d++) {
      const day = addDays(startOfDay(new Date()), d + 1);
      const dayOfWeek = day.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (let hour = 9; hour < 17; hour++) {
        const slotStart = addHours(day, hour);
        const slotEnd = addHours(day, hour + 1);

        const isBusy = busyPeriods.some((period) => {
          const busyStart = new Date(period.start!);
          const busyEnd = new Date(period.end!);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (!isBusy) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            display: format(slotStart, "EEEE d 'de' MMMM 'a las' HH:mm"),
          });
        }
      }
    }

    void service;
    return slots.slice(0, 10);
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const response = await this.calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: {
          dateTime: input.start.toISOString(),
          timeZone: "America/Mexico_City",
        },
        end: {
          dateTime: input.end.toISOString(),
          timeZone: "America/Mexico_City",
        },
      },
    });

    return {
      id: response.data.id!,
      calendarId: this.calendarId,
      summary: response.data.summary!,
      start: new Date(response.data.start!.dateTime!),
      end: new Date(response.data.end!.dateTime!),
    };
  }

  async updateEvent(
    eventId: string,
    updates: Partial<CreateEventInput>
  ): Promise<CalendarEvent> {
    const requestBody: Record<string, unknown> = {};
    if (updates.summary) requestBody.summary = updates.summary;
    if (updates.start) {
      requestBody.start = { dateTime: updates.start.toISOString(), timeZone: "America/Mexico_City" };
    }
    if (updates.end) {
      requestBody.end = { dateTime: updates.end.toISOString(), timeZone: "America/Mexico_City" };
    }

    const response = await this.calendar.events.update({
      calendarId: this.calendarId,
      eventId,
      requestBody,
    });

    return {
      id: response.data.id!,
      calendarId: this.calendarId,
      summary: response.data.summary!,
      start: new Date(response.data.start!.dateTime!),
      end: new Date(response.data.end!.dateTime!),
    };
  }

  async cancelEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: this.calendarId,
      eventId,
    });
  }
}

const getAppUrl = () => {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export async function getCalendarService(
  organizationId: string
): Promise<CalendarService | null> {
  const config = await prisma.googleCalendarConfig.findUnique({
    where: { organizationId },
  });

  if (!config?.isConnected || !config.refreshTokenEnc) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getAppUrl()}/api/integrations/google-calendar/callback`
  ) as OAuth2Client;

  oauth2Client.setCredentials({
    access_token: safeDecrypt(config.accessTokenEnc),
    refresh_token: safeDecrypt(config.refreshTokenEnc),
    expiry_date: config.expiryDate?.getTime(),
  });

  oauth2Client.on("tokens", async (tokens) => {
    await prisma.googleCalendarConfig.update({
      where: { organizationId },
      data: {
        accessTokenEnc: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return new CalendarService(
    oauth2Client,
    config.calendarId ?? "primary",
    organizationId
  );
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getAppUrl()}/api/integrations/google-calendar/callback`
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent",
  });
}
