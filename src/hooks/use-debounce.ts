import { useEffect, useState } from "react";

/** Devuelve una versión "debounced" del valor, útil para inputs de búsqueda. */
export function useDebounce<T>(valor: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), delayMs);
    return () => clearTimeout(timer);
  }, [valor, delayMs]);
  return debounced;
}
