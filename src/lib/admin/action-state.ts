// Esito delle Server Action del pannello, mostrato da <ActionForm>.
export type ActionState =
  | { status: "idle" }
  | { status: "ok"; message: string }
  | { status: "error"; message: string };

export const IDLE_STATE: ActionState = { status: "idle" };
