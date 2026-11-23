"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { IDLE_STATE, type ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils";

export type AdminAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/**
 * Modulo collegato a una Server Action. Mostra l'esito (verde = fatto, rosso = errore) sotto i campi.
 *
 * L'invio è gestito a mano (preventDefault + startTransition) invece che con `action={...}`: React, dopo
 * un modulo con `action`, rimette tutti i campi al valore iniziale. Nei menu a tendina questo faceva
 * tornare il vecchio valore dopo un salvataggio riuscito, e dopo un errore faceva perdere all'admin
 * quello che aveva scritto. Così i campi restano com'erano; con `resetOnSuccess` si svuotano solo
 * dopo un invio riuscito (utile per i messaggi).
 */
export function ActionForm({
  action,
  children,
  className,
  testId,
  resetOnSuccess = false,
}: {
  action: AdminAction;
  children: ReactNode;
  className?: string;
  testId?: string;
  resetOnSuccess?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(action, IDLE_STATE);

  useEffect(() => {
    if (resetOnSuccess && state.status === "ok") formRef.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className={className} data-testid={testId} aria-busy={pending}>
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
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
  disabled,
}: {
  children: ReactNode;
  confirm?: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
  name?: string;
  value?: string;
  className?: string;
  disabled?: boolean;
}) {
  const pending = useContext(PendingContext);
  return (
    <Button
      type="submit"
      variant={variant}
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cn("min-h-9", className)}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
