// Thin createServerFn wrappers. All server-only logic lives in account-actions.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  runProcessAccountSubmission,
  runAdminApproveAccount,
  runAdminFailAccount,
  runAdminApproveWithdraw,
  runAdminFailWithdraw,
  runNotifyWithdrawSubmission,
} from "./account-actions.server";

export const processAccountSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string }) => {
    if (!input?.accountId || typeof input.accountId !== "string") throw new Error("accountId required");
    return input;
  })
  .handler(async ({ data, context }) => runProcessAccountSubmission(context.userId, data.accountId));

export const adminApproveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string }) => {
    if (!input?.accountId) throw new Error("accountId required");
    return input;
  })
  .handler(async ({ data, context }) => runAdminApproveAccount(context.userId, data.accountId));

export const adminFailAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { accountId: string; reason?: string }) => {
    if (!input?.accountId) throw new Error("accountId required");
    return input;
  })
  .handler(async ({ data, context }) => runAdminFailAccount(context.userId, data.accountId, data.reason));

export const adminApproveWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { withdrawId: string }) => {
    if (!input?.withdrawId) throw new Error("withdrawId required");
    return input;
  })
  .handler(async ({ data, context }) => runAdminApproveWithdraw(context.userId, data.withdrawId));

export const adminFailWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { withdrawId: string; reason?: string }) => {
    if (!input?.withdrawId) throw new Error("withdrawId required");
    return input;
  })
  .handler(async ({ data, context }) => runAdminFailWithdraw(context.userId, data.withdrawId, data.reason));

export const notifyWithdrawSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { withdrawId: string }) => {
    if (!input?.withdrawId) throw new Error("withdrawId required");
    return input;
  })
  .handler(async ({ data, context }) => runNotifyWithdrawSubmission(context.userId, data.withdrawId));