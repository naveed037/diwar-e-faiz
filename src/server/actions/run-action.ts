import "server-only";
import { z, type ZodType } from "zod";
import { AppError, DEFAULT_MESSAGES, type ActionResult } from "@/lib/errors";

/**
 * Wraps every server action:
 *  1. validates untrusted input with a zod schema (server-side, always),
 *  2. runs the handler,
 *  3. converts errors into a safe ActionResult — internal details are logged, never returned.
 */
export async function runAction<S extends ZodType, R>(
  schema: S,
  input: unknown,
  handler: (data: z.output<S>) => Promise<R>,
): Promise<ActionResult<R>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid-input",
      message: DEFAULT_MESSAGES["invalid-input"],
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
    };
  }

  try {
    return { ok: true, data: await handler(parsed.data) };
  } catch (error) {
    if (error instanceof AppError) {
      // Configuration and internal errors may contain env names or stack details: log them, return a generic message.
      const sensitive = error.code === "not-configured" || error.code === "internal";
      if (sensitive) console.error("[action]", error.message);
      return {
        ok: false,
        code: error.code,
        message: sensitive ? DEFAULT_MESSAGES[error.code] : error.message,
        fieldErrors: error.fieldErrors,
      };
    }
    console.error("[action] unexpected error", error);
    return { ok: false, code: "internal", message: DEFAULT_MESSAGES.internal };
  }
}
