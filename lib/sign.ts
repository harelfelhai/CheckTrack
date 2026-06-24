import { getStore } from "@/lib/store";
import { renderCheckPdf } from "@/lib/pdf";
import { buildCheckFileName } from "@/lib/naming";
import type { CheckRecord, SignatureInput } from "@/lib/types";

export type SignResult =
  | { ok: true; check: CheckRecord }
  | { ok: false; status: number; error: string };

/**
 * Applies a signature to a check (shared by frontal signing and remote
 * signing): marks it "delivered", stamps the time + signer name, renders the
 * signed PDF, archives it, and writes the file URL back to the record.
 */
export async function applySignature(
  checkNumber: string,
  input: SignatureInput & { imageDataUrl?: string | null },
): Promise<SignResult> {
  const store = await getStore();
  const record = await store.getCheck(checkNumber);
  if (!record) return { ok: false, status: 404, error: "הצ'ק לא נמצא" };
  if (record.status === "delivered") {
    return { ok: false, status: 409, error: "הצ'ק כבר סומן כנמסר" };
  }

  const deliveredAt = new Date().toISOString();
  const signerName = input.signerName.trim();
  const updated: CheckRecord = {
    ...record,
    status: "delivered",
    deliveredAt,
    signerName,
  };

  const scan = input.imageDataUrl ?? (await store.getImage(checkNumber));
  const pdfBytes = await renderCheckPdf({
    record: updated,
    checkImageDataUrl: scan,
    signatureDataUrl: input.signatureDataUrl,
  });
  const fileName = buildCheckFileName(updated);
  const { url } = await store.savePdf(checkNumber, fileName, pdfBytes);

  const saved = await store.updateCheck(checkNumber, {
    status: "delivered",
    deliveredAt,
    signerName,
    fileUrl: url,
  });
  // Never report success if the status did not actually persist. The previous
  // `saved ?? {...updated}` fallback could tell a supplier "נחתם בהצלחה" while
  // the row stayed "לא נמסר" — a silent delivery-record loss. Surface it so the
  // caller (and the signer) can retry instead.
  if (!saved) {
    return {
      ok: false,
      status: 500,
      error: "החתימה עובדה אך שמירת הסטטוס נכשלה. נסו שוב.",
    };
  }
  return { ok: true, check: saved };
}
