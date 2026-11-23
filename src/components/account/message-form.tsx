"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type MessageState } from "@/app/[locale]/area-clienti/[codice]/actions";
import { Field, inputClass } from "@/components/interest/field";
import { Button } from "@/components/ui/button";
import type { AccountMessages } from "./upload-form";

const IDLE: MessageState = { status: "idle" };

export function MessageForm({ requestId, messages: m }: { requestId: string; messages: AccountMessages }) {
  const [state, formAction, pending] = useActionState(sendMessage, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = m.messageErrors as Record<string, string>;

  useEffect(() => {
    if (state.status === "sent") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex flex-col gap-3" data-testid="message-form">
      <input type="hidden" name="request_id" value={requestId} />
      <Field id="message-body" label={m.messageLabel} error={state.status === "error" ? errors[state.code] : undefined}>
        <textarea
          id="message-body"
          name="body"
          rows={4}
          maxLength={5000}
          required
          defaultValue={state.status === "error" ? state.draft : ""}
          className={inputClass}
          aria-invalid={state.status === "error" ? true : undefined}
        />
      </Field>
      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? m.messageSending : m.messageSend}
        </Button>
        {state.status === "sent" ? (
          <p role="status" className="text-sm text-zinc-700">
            {m.messageSent}
          </p>
        ) : null}
      </div>
    </form>
  );
}
