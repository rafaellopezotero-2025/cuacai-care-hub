import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Estilo común para estados vacíos y mensajes de pantalla sin datos. */
export const PANTALLA_VACIA_CLASS =
  "flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground";
