/** Google Calendar integration for TurnoHub */

const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const TZ = "America/Argentina/Buenos_Aires";

export function getGoogleClientId(): string | null {
  return process.env.GOOGLE_CLIENT_ID || null;
}
export function getGoogleClientSecret(): string | null {
  return process.env.GOOGLE_CLIENT_SECRET || null;
}

export function isGoogleConfigured(): boolean {
  return !!(getGoogleClientId() && getGoogleClientSecret());
}

/** Build OAuth URL for a professional to authorize Google Calendar */
export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId()!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchange code for tokens */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: getGoogleClientId()!,
        client_secret: getGoogleClientSecret()!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return null;
    return await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
  } catch {
    return null;
  }
}

/** Refresh an expired access token */
export async function refreshGoogleToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: getGoogleClientId()!,
        client_secret: getGoogleClientSecret()!,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

export interface CalendarEvent {
  summary: string;
  description?: string;
  startDate: string;  // yyyy-MM-dd
  startTime: string;  // HH:mm:ss
  endTime: string;    // HH:mm:ss
}

/** Create a calendar event, returns eventId */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent
): Promise<string | null> {
  try {
    const body = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: `${event.startDate}T${event.startTime}`, timeZone: TZ },
      end: { dateTime: `${event.startDate}T${event.endTime}`, timeZone: TZ },
    };
    const res = await fetch(`${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id?: string };
    return data.id || null;
  } catch {
    return null;
  }
}

/** Update an existing calendar event */
export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: CalendarEvent
): Promise<boolean> {
  try {
    const body = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: `${event.startDate}T${event.startTime}`, timeZone: TZ },
      end: { dateTime: `${event.startDate}T${event.endTime}`, timeZone: TZ },
    };
    const res = await fetch(`${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Delete/cancel a calendar event */
export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}

/** Get primary calendar ID (usually 'primary') */
export async function getPrimaryCalendarId(accessToken: string): Promise<string> {
  return "primary";
}
