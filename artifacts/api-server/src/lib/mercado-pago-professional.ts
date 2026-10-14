import { db, professionalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const MP_API = "https://api.mercadopago.com";

export async function professionalMpFetch(
  professional: {
    id: number;
    mpAccessToken: string | null;
    mpRefreshToken: string | null;
  },
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!professional.mpAccessToken) {
    throw new Error("Professional Mercado Pago account is not connected.");
  }

  const makeRequest = (accessToken: string) => fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const firstResponse = await makeRequest(professional.mpAccessToken);
  if (firstResponse.status !== 401 || !professional.mpRefreshToken) return firstResponse;

  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return firstResponse;

  const refreshResponse = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: professional.mpRefreshToken,
    }),
  });
  if (!refreshResponse.ok) return firstResponse;

  const tokens = await refreshResponse.json() as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!tokens.access_token) return firstResponse;

  await db.update(professionalsTable)
    .set({
      mpAccessToken: tokens.access_token,
      mpRefreshToken: tokens.refresh_token ?? professional.mpRefreshToken,
      updatedAt: new Date(),
    })
    .where(eq(professionalsTable.id, professional.id));

  return makeRequest(tokens.access_token);
}
