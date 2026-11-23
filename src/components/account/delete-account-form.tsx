"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "@/app/[locale]/area-clienti/profilo/actions";
import { Field, inputClass } from "@/components/interest/field";
import { Button } from "@/components/ui/button";
import type { AccountMessages } from "./upload-form";

const IDLE: DeleteState = { status: "idle" };

// Il pulsante resta spento finché l'email digitata non coincide con quella dell'account.
// È solo un aiuto: il controllo vero lo rifà il server, con l'email della sessione.
export function DeleteAccountForm({
  email,
  locale,
  messages: m,
}: {
  email: string;
  locale: string;
  messages: AccountMessages;
}) {
  const [state, formAction, pending] = useActionState(deleteAccount, IDLE);
  const [typed, setTyped] = useState("");
  const errors = m.deleteErrors as Record<string, string>;
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4" data-testid="delete-form">
      <input type="hidden" name="locale" value={locale} />
      {state.status === "error" ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors[state.code]}
        </p>
      ) : null}
      <Field id="delete-confirmation" label={m.deleteConfirmLabel.replace("{email}", email)}>
        <input
          id="delete-confirmation"
          name="confirmation"
          type="email"
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className={inputClass}
        />
      </Field>
      <div>
        <Button type="submit" variant="destructive" size="lg" disabled={!matches || pending}>
          {pending ? m.deleting : m.deleteButton}
        </Button>
      </div>
    </form>
  );
}
