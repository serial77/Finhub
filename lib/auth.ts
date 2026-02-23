export const AUTH_COOKIE = "finance_session";

const enc = new TextEncoder();

async function sha256(input: string): Promise<string> {
  const bytes = enc.encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function expectedSessionToken(user: string, pass: string, secret: string): Promise<string> {
  return sha256(`${user}:${pass}:${secret}`);
}
