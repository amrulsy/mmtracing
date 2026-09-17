export function getWhatsAppUrl(number?: string, message?: string) {
  let phone = (number || "").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = `62${phone.slice(1)}`;
  if (!/^\d{9,15}$/.test(phone) || phone === "62274123456") return null;
  const base = `https://wa.me/${phone}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
