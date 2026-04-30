import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAdminListUsers, runAdminListAccounts, runAdminListWithdraws } from "./admin-users.server";

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => runAdminListUsers(context.userId));

export const adminListAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => runAdminListAccounts(context.userId));

export const adminListWithdraws = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => runAdminListWithdraws(context.userId));