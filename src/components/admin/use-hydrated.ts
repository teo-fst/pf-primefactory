"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False nel codice HTML del server, true appena la pagina è "idratata" nel browser (JavaScript attivo). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
