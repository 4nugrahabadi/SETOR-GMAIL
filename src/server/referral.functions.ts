// Server function untuk award referral bonus.
// Dipanggil dari client setelah register sukses (sebelum email confirm), via service role.
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const awardReferralBonus = createServerFn({ method: "POST" })
  .inputValidator((input: { newUserId: string }) => {
    if (!input?.newUserId || typeof input.newUserId !== "string") throw new Error("newUserId required");
    if (!/^[0-9a-f-]{36}$/i.test(input.newUserId)) throw new Error("invalid newUserId");
    return input;
  })
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.rpc("award_referral_bonus" as any, { _new_user_id: data.newUserId });
    if (error) {
      console.error("award_referral_bonus failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  });
