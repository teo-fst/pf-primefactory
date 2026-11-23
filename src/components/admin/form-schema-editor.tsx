"use client";

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton, type AdminAction } from "@/components/admin/action-form";
import { inputClass } from "@/components/interest/field";
import { parseFormSchemaText, type SchemaIssue } from "@/lib/admin/form-schema-editor";
import type { AdminMessages } from "@/lib/admin/messages";

type Props = {
  action: AdminAction;
  slug: string;
  initial: string;
  messages: AdminMessages["content"];
};

function describeIssue(issue: SchemaIssue, m: AdminMessages["content"]): string {
  const where = issue.index === null ? "" : `${m.schemaField} ${issue.index + 1}${issue.key ? ` (${issue.key})` : ""}: `;
  const text = (m.schemaIssues as Record<string, string>)[issue.code] ?? issue.code;
  return `${where}${text}${issue.detail ? ` [${issue.detail}]` : ""}`;
}

/**
 * Editor della form_schema di una linea (Q43): testo JSON con validazione mentre si scrive.
 * Il pulsante Salva resta spento finché la struttura non è valida; il server la ricontrolla comunque.
 */
export function FormSchemaEditor({ action, slug, initial, messages: m }: Props) {
  const [text, setText] = useState(initial);
  const result = useMemo(() => parseFormSchemaText(text), [text]);

  return (
    <ActionForm action={action} className="flex flex-col gap-4" testId="schema-form">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {m.schemaLabel}
        <textarea
          name="schema"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          spellCheck={false}
          aria-invalid={!result.ok}
          aria-describedby="schema-status"
          className={`${inputClass} font-mono text-xs`}
        />
      </label>

      <div id="schema-status" data-testid="schema-status" aria-live="polite">
        {result.ok ? (
          <p className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
            {m.schemaValid.replace("{count}", String(result.schema.length))}
          </p>
        ) : (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p className="font-medium">{m.schemaInvalidTitle}</p>
            <ul className="mt-1 list-disc pl-5" data-testid="schema-issues">
              {result.issues.slice(0, 12).map((issue, i) => (
                <li key={i}>{describeIssue(issue, m)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {result.ok && result.schema.length > 0 ? (
        <div>
          <p className="mb-1 text-sm font-medium">{m.schemaPreview}</p>
          <ul className="space-y-1 text-sm" data-testid="schema-preview">
            {result.schema.map((f) => (
              <li key={f.key}>
                <code className="text-xs">{f.key}</code> · {f.type} · {f.label_it} / {f.label_en}
                {f.required ? ` · ${m.schemaRequired}` : ""}
                {f.options ? ` · ${f.options.map((o) => o.value).join(", ")}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <SubmitButton disabled={!result.ok}>{m.schemaSave}</SubmitButton>
      </div>
    </ActionForm>
  );
}
