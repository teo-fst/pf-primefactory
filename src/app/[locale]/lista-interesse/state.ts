import type { InterestErrorCode } from "@/lib/interest/submit";

export type InterestFormState =
  | { status: "idle" }
  | { status: "invalid"; errors: Record<string, string>; values: Record<string, string> }
  | { status: "error"; code: InterestErrorCode; values: Record<string, string> };
