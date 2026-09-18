import { getRequest } from "@tanstack/react-start/server";

/** Metadatos de la petición HTTP para auditoría (IP y agente de usuario), saneados. */
export function getRequestMeta(): { ip: string | null; userAgent: string | null } {
  const headers = getRequest()?.headers;
  const forwarded = headers?.get("x-forwarded-for") ?? headers?.get("cf-connecting-ip") ?? "";
  const ip = forwarded.split(",")[0]?.trim().replace(/[^0-9a-fA-F.:]/g, "") || null;
  const userAgent = (headers?.get("user-agent") ?? "").slice(0, 300) || null;
  return { ip, userAgent };
}
