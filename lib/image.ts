/** Turns a base64 image data URL into a binary image Response, or null when the
 *  input isn't a valid image data URL. Shared by the dashboard and the public
 *  remote-signing scan endpoints. */
export function imageResponse(dataUrl: string | null): Response | null {
  const m = dataUrl?.match(/^data:(image\/[\w.+-]+);base64,(.*)$/s);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "private, max-age=300",
    },
  });
}
