"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { IDLE_STATE, type ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils";

export type AdminAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

/** Rimette nei campi i valori inviati: React svuota il modulo dopo ogni invio, ma dopo un errore l'admin deve ritrovare quello che aveva scritto. */
function restoreFormValues(form: HTMLFormElement, data: FormData) {
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement)) continue;
    if (!element.name || element.type === "file" || element.type === "hidden" || element.type === "submit") continue;
    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      const values = data.getAll(element.name).map(String);
      element.checked = values.includes(element.value);
    } else {
      const value = data.get(element.name);
      if (typeof value === "string") element.value = value;
    }
  }
}

/**
 * Modulo collegato a una Server Action. Mostra l'esito (verde = fatto, rosso = errore) sotto i campi.
 * Funziona anche prima che la pagina sia "idratata" (invio classico del modulo).
 */
export function ActionForm({
  action,
  children,
  className,
  testId,
}: {
  action: AdminAction;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastData = useRef<FormData | null>(null);
  const [state, formAction] = useActionState<ActionState, FormData>(async (previous, data) => {
    lastData.current = data;
    return action(previous, data);
  }, IDLE_STATE);

  useEffect(() => {
    if (state.status === "error" && formRef.current && lastData.current) {
      restoreFormValues(formRef.current, lastData.current);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={className} data-testid={testId}>
      {children}
      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-sm",
            state.status === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-green-300 bg-green-50 text-green-900",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Pulsante di invio. Con `confirm` chiede conferma prima di inviare (azioni difficili da annullare). */
export function SubmitButton({
  children,
  confirm,
  variant = "default",
  name,
  value,
  className,
}: {
  children: ReactNode;
  confirm?: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      name={name}
      value={value}
      disabled={pending}
      className={cn("min-h-9", className)}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
