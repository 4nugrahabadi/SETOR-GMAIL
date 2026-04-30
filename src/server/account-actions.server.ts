// Server-only helpers (uses service role). Import only from .functions.ts handlers.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyAdminWhatsApp, sendWhatsApp } from "./fonnte.server";

async function getProfile(userId: string) {
  const { data } = await supabaseAdmin.from("profiles").select("id, username, balance, whatsapp").eq("id", userId).maybeSingle();
  return data;
}

async function notifyUserWhatsApp(userId: string, message: string) {
  const profile = await getProfile(userId);
  const wa = (profile as { whatsapp?: string | null } | null)?.whatsapp;
  if (!wa) return;
  await sendWhatsApp(wa, message);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  return !!(data && data.length > 0);
}

async function pushNotif(userId: string, title: string, body: string, variant: "success" | "error" | "info") {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, variant });
}

async function getSettings() {
  const { data } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}

async function creditUser(userId: string, amount: number) {
  const profile = await getProfile(userId);
  if (!profile) return;
  await supabaseAdmin.from("profiles").update({ balance: (profile.balance ?? 0) + amount }).eq("id", userId);
}

export async function runProcessAccountSubmission(userId: string, accountId: string) {
  const { data: acc } = await supabaseAdmin.from("accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acc || acc.user_id !== userId) throw new Error("Account not found");
  if (acc.status !== "processing") return { ok: true };

  const settings = await getSettings();
  if (!settings) throw new Error("Settings missing");

  const { data: dups } = await supabaseAdmin
    .from("accounts").select("id").eq("email", acc.email).neq("id", acc.id);
  if (dups && dups.length > 0) {
    await supabaseAdmin.from("accounts").update({
      status: "failed", reason: "Email double terdeteksi", password: null, resolved_at: new Date().toISOString(),
    }).eq("id", acc.id);
    await pushNotif(userId, "Akun GAGAL", `Email ${acc.email} double terdeteksi — otomatis gagal.`, "error");
    return { ok: true };
  }

  // Validasi password — jika tidak sesuai, langsung gagal & hapus password
  if ((acc.password ?? "") !== settings.valid_password) {
    await supabaseAdmin.from("accounts").update({
      status: "failed", reason: "Password tidak sesuai", password: null, resolved_at: new Date().toISOString(),
    }).eq("id", acc.id);
    await pushNotif(userId, "Akun GAGAL", `Password tidak sesuai untuk ${acc.email}.`, "error");
    return { ok: true };
  }

  // Password valid → simpan & tunggu review manual admin
  await pushNotif(userId, "Akun menunggu review",
    `${acc.email} berhasil dikirim. Menunggu admin memproses.`, "info");

  // Notif admin via WhatsApp
  const profile = await getProfile(userId);
  const uname = profile?.username ?? userId.slice(0, 8);
  await notifyAdminWhatsApp(
    `🆕 SETORAN BARU\n\nUser: ${uname}\nEmail Gmail: ${acc.email}\nStatus: Menunggu review admin\n\nBuka panel admin untuk memproses.`
  );

  return { ok: true };
}

export async function runAdminApproveAccount(adminId: string, accountId: string) {
  if (!(await isAdmin(adminId))) throw new Error("Admin only");
  const { data: acc } = await supabaseAdmin.from("accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acc || acc.status !== "processing") throw new Error("Account not pending");
  const settings = await getSettings();
  if (!settings) throw new Error("Settings missing");
  await supabaseAdmin.from("accounts").update({
    status: "success", password: null, resolved_at: new Date().toISOString(),
  }).eq("id", acc.id);
  await creditUser(acc.user_id, settings.price_per_account);
  await pushNotif(acc.user_id, "Akun BERHASIL ✅",
    `${acc.email} disetujui admin. Saldo +Rp${settings.price_per_account.toLocaleString("id-ID")}.`, "success");
  const profile = await getProfile(acc.user_id);
  const uname = profile?.username ?? acc.user_id.slice(0, 8);
  await notifyAdminWhatsApp(
    `✅ SETORAN BERHASIL\n\nUser: ${uname}\nEmail Gmail: ${acc.email}\nSaldo user +Rp${settings.price_per_account.toLocaleString("id-ID")}\nStatus: Disetujui admin.`
  );
  await notifyUserWhatsApp(acc.user_id,
    `✅ Halo ${uname}, setoran Gmail *${acc.email}* BERHASIL diverifikasi admin.\n\nSaldo Anda bertambah Rp${settings.price_per_account.toLocaleString("id-ID")}.\n\nTerima kasih telah menggunakan SetorGmail!`
  );
  return { ok: true };
}

export async function runAdminFailAccount(adminId: string, accountId: string, reason?: string) {
  if (!(await isAdmin(adminId))) throw new Error("Admin only");
  const { data: acc } = await supabaseAdmin.from("accounts").select("*").eq("id", accountId).maybeSingle();
  if (!acc || acc.status !== "processing") throw new Error("Account not pending");
  await supabaseAdmin.from("accounts").update({
    status: "failed", reason: reason || "Ditolak admin", password: null, resolved_at: new Date().toISOString(),
  }).eq("id", acc.id);
  await pushNotif(acc.user_id, "Akun GAGAL",
    `${acc.email} ditandai gagal oleh admin.${reason ? " Alasan: " + reason : ""}`, "error");
  const profile = await getProfile(acc.user_id);
  const uname = profile?.username ?? acc.user_id.slice(0, 8);
  await notifyAdminWhatsApp(
    `❌ SETORAN GAGAL\n\nUser: ${uname}\nEmail Gmail: ${acc.email}\nAlasan: ${reason || "Ditolak admin"}\nStatus: Ditandai gagal.`
  );
  await notifyUserWhatsApp(acc.user_id,
    `❌ Halo ${uname}, setoran Gmail *${acc.email}* ditandai GAGAL oleh admin.\n\nAlasan: ${reason || "Ditolak admin"}\n\nSilakan cek aplikasi atau hubungi CS untuk informasi lebih lanjut.`
  );
  return { ok: true };
}

export async function runAdminApproveWithdraw(adminId: string, withdrawId: string) {
  if (!(await isAdmin(adminId))) throw new Error("Admin only");
  const { data: w } = await supabaseAdmin.from("withdraws").select("*").eq("id", withdrawId).maybeSingle();
  if (!w || w.status !== "processing") throw new Error("Withdraw not pending");
  await supabaseAdmin.from("withdraws").update({
    status: "success", resolved_at: new Date().toISOString(),
  }).eq("id", w.id);
  await pushNotif(w.user_id, "Penarikan BERHASIL ✅",
    `Rp${w.amount.toLocaleString("id-ID")} ke ${w.method} ${w.number} telah disetujui admin.`, "success");
  const profile = await getProfile(w.user_id);
  const uname = profile?.username ?? w.user_id.slice(0, 8);
  await notifyAdminWhatsApp(
    `✅ PENARIKAN BERHASIL\n\nUser: ${uname}\nMetode: ${w.method}\nNomor: ${w.number}\nA.n: ${w.name}\nJumlah: Rp${w.amount.toLocaleString("id-ID")}\nStatus: Disetujui admin.`
  );
  await notifyUserWhatsApp(w.user_id,
    `✅ Halo ${uname}, penarikan Anda BERHASIL diproses.\n\nJumlah: Rp${w.amount.toLocaleString("id-ID")}\nMetode: ${w.method}\nNomor: ${w.number}\nA.n: ${w.name}\n\nSilakan cek saldo tujuan Anda. Terima kasih!`
  );
  return { ok: true };
}

export async function runAdminFailWithdraw(adminId: string, withdrawId: string, reason?: string) {
  if (!(await isAdmin(adminId))) throw new Error("Admin only");
  const { data: w } = await supabaseAdmin.from("withdraws").select("*").eq("id", withdrawId).maybeSingle();
  if (!w || w.status !== "processing") throw new Error("Withdraw not pending");
  await supabaseAdmin.from("withdraws").update({
    status: "failed", reason: reason || "Gagal diproses", resolved_at: new Date().toISOString(),
  }).eq("id", w.id);
  await creditUser(w.user_id, w.total);
  await pushNotif(w.user_id, "Penarikan GAGAL",
    `Rp${w.amount.toLocaleString("id-ID")} ke ${w.method} ${w.number} gagal.${reason ? " Alasan: " + reason : ""} Saldo dikembalikan.`,
    "error");
  const profile = await getProfile(w.user_id);
  const uname = profile?.username ?? w.user_id.slice(0, 8);
  await notifyAdminWhatsApp(
    `❌ PENARIKAN GAGAL\n\nUser: ${uname}\nMetode: ${w.method}\nNomor: ${w.number}\nA.n: ${w.name}\nJumlah: Rp${w.amount.toLocaleString("id-ID")}\nAlasan: ${reason || "Gagal diproses"}\nSaldo Rp${w.total.toLocaleString("id-ID")} dikembalikan ke user.`
  );
  await notifyUserWhatsApp(w.user_id,
    `❌ Halo ${uname}, penarikan Rp${w.amount.toLocaleString("id-ID")} ke ${w.method} ${w.number} GAGAL diproses.\n\nAlasan: ${reason || "Gagal diproses"}\nSaldo Rp${w.total.toLocaleString("id-ID")} telah dikembalikan ke akun Anda.`
  );
  return { ok: true };
}

export async function runNotifyWithdrawSubmission(userId: string, withdrawId: string) {
  const { data: w } = await supabaseAdmin.from("withdraws").select("*").eq("id", withdrawId).maybeSingle();
  if (!w || w.user_id !== userId) return { ok: true };
  const profile = await getProfile(userId);
  const uname = profile?.username ?? userId.slice(0, 8);
  await notifyAdminWhatsApp(
    `💸 PENARIKAN BARU\n\nUser: ${uname}\nMetode: ${w.method}\nNomor: ${w.number}\nA.n: ${w.name}\nJumlah: Rp${w.amount.toLocaleString("id-ID")}\nFee: Rp${w.fee.toLocaleString("id-ID")}\nTotal potong: Rp${w.total.toLocaleString("id-ID")}\n\nStatus: Menunggu review admin.`
  );
  return { ok: true };
}