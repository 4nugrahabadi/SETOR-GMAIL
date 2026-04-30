// Fonnte WhatsApp helper. Server-only — uses FONNTE_TOKEN env.
const ADMIN_WA = "628980558429"; // +62 898-0558-429 → 62 + 898... (E.164 tanpa +)

export async function sendWhatsApp(target: string, message: string): Promise<void> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn("[fonnte] FONNTE_TOKEN tidak diset — skip kirim WA");
    return;
  }
  try {
    const body = new URLSearchParams({
      target,
      message,
      countryCode: "62",
    });
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[fonnte] gagal ${res.status}: ${txt}`);
    }
  } catch (e) {
    console.error("[fonnte] error:", e);
  }
}

export async function notifyAdminWhatsApp(message: string): Promise<void> {
  await sendWhatsApp(ADMIN_WA, message);
}