const enc = new TextEncoder();
async function sig(v: string) {
  const k = await crypto.subtle.importKey("raw", enc.encode(process.env.AUTH_SECRET ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(v)))));
}
export const COOKIE = "td_session";
export async function makeToken() { const v = String(Date.now() + 7 * 864e5); return `${v}.${await sig(v)}`; }
export async function validToken(t?: string) {
  if (!t || !process.env.AUTH_SECRET) return false;
  const [v, s] = t.split(".");
  return !!s && Number(v) > Date.now() && s === (await sig(v));
}
export function safeEqual(a: string, b: string) {
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
