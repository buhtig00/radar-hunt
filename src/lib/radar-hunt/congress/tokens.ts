// RADAR HUNT — tokens de los QR de estación. Aleatorios (100 bits), no adivinables y
// rotables: el QR apunta a /radar-hunt/congresos/{slug}/e/{token}. El código manual
// (8 caracteres) sirve si la cámara no funciona; ambos se resuelven en el servidor.

/** Alfabeto Crockford base32 sin caracteres ambiguos (sin I, L, O, U). */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const TOKEN_LENGTH = 20;

export function generateToken(random: (n: number) => Uint8Array = cryptoBytes): string {
  const bytes = random(TOKEN_LENGTH);
  let out = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) out += ALPHABET[bytes[i] & 31];
  return out;
}

function cryptoBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

/** Código manual a partir del token: los 8 primeros caracteres, en dos grupos. */
export function manualCode(token: string): string {
  const t = token.slice(0, 8);
  return `${t.slice(0, 4)}-${t.slice(4)}`;
}

/** Normaliza lo que teclea o escanea el participante (minúsculas, guiones, O/0, I/1…). */
export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/[^0-9A-Z]/g, "");
}

/**
 * Extrae el token o código de lo leído: una URL de estación (…/e/{token}), un token
 * suelto o un código manual. Devuelve null si no parece ninguno de ellos.
 */
export function parseScan(raw: string): { token?: string; code?: string } | null {
  const text = raw.trim();
  const m = text.match(/\/e\/([0-9A-Za-z]{8,40})(?:[/?#]|$)/);
  if (m) return { token: normalizeCode(m[1]) };
  const n = normalizeCode(text);
  if (n.length === TOKEN_LENGTH) return { token: n };
  if (n.length === 8) return { code: n };
  return null;
}

export function stationUrl(origin: string, slug: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/radar-hunt/congresos/${slug}/e/${token}`;
}
