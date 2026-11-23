import "server-only";
import type { NotifyEventType } from "./types";

// Chi riceve cosa, per tipo di evento (Q13, Q27, Q31, Q35).
//   customer_email : email al cliente della richiesta, nella lingua del suo profilo
//   admin_email    : email a ciascun socio admin
//   telegram       : un messaggio nel gruppo soci (solo se il bot è configurato)
export type DeliveryStep = "customer_email" | "admin_email" | "telegram";

export const DELIVERY_PLAN: Record<NotifyEventType, readonly DeliveryStep[]> = {
  // Conferma al cliente + avviso ai soci
  request_created: ["customer_email", "admin_email", "telegram"],
  // Cambio di stato: solo il cliente (il trigger crea l'evento solo se lo stato ha notify_client)
  status_changed: ["customer_email"],
  // Messaggio del cliente: solo i soci
  message_from_customer: ["admin_email"],
  // Messaggio di un admin non interno: solo il cliente. Le note interne non generano eventi.
  message_from_admin: ["customer_email"],
  // File caricato: soci (email + Telegram)
  file_uploaded: ["admin_email", "telegram"],
};

export function planDeliveries(eventType: NotifyEventType): readonly DeliveryStep[] {
  return DELIVERY_PLAN[eventType];
}
