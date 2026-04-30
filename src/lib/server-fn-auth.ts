// Helper to call createServerFn endpoints with Supabase auth header attached.
import { supabase } from "@/integrations/supabase/client";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ServerFn<TArgs, TResult> = (opts: TArgs & { headers?: HeadersInit }) => Promise<TResult>;

/** Call a TanStack server function and attach the current Supabase session as Bearer token. */
export async function callAuthed<TArgs extends { data?: unknown } | undefined, TResult>(
  fn: ServerFn<TArgs extends undefined ? { data?: undefined } : TArgs, TResult>,
  args?: TArgs,
): Promise<TResult> {
  const headers = await authHeaders();
  return fn({ ...(args ?? ({} as any)), headers } as any);
}