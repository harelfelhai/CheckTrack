/**
 * Builds the share message + links for remote signing (spec §5.א).
 * The message text matches the template in the spec.
 */

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("he-IL").format(amount);
}

export function buildSigningMessage(opts: {
  companyName: string;
  checkNumber: string;
  amount: number;
  writtenDate: string;
  url: string;
}): string {
  return `שלום, מצורפים פרטי צ'ק עבורכם מחברת ${opts.companyName}:
מספר צ'ק: ${opts.checkNumber}
סכום: ${formatAmount(opts.amount)} ש"ח
תאריך צ'ק: ${opts.writtenDate}
לאישור ומעבר למסך חתימה דיגיטלית על קבלת הצ'ק, לחצו על הקישור הבא: ${opts.url}`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(message: string, subject = "אישור קבלת צ'ק"): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
