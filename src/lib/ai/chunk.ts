// Text chunking for the RAG corpus. Splits long source documents into
// overlapping windows so retrieval can match the relevant passage instead of a
// whole monograph (better recall + tighter context). Short docs pass through
// unchanged as a single chunk.

export interface ChunkOptions {
  /** Target maximum characters per chunk. */
  maxChars?: number;
  /** Characters of overlap carried into the next chunk for continuity. */
  overlap?: number;
}

const DEFAULT_MAX = 1200;
const DEFAULT_OVERLAP = 150;

/**
 * Split `content` into chunks of at most `maxChars`, preferring paragraph and
 * sentence boundaries so we never cut mid-word. Consecutive chunks share
 * `overlap` characters of tail context. Returns `[content]` when it already
 * fits, and `[]` for empty input.
 */
export function chunkContent(content: string, opts: ChunkOptions = {}): string[] {
  const maxChars = Math.max(200, opts.maxChars ?? DEFAULT_MAX);
  const overlap = Math.max(0, Math.min(opts.overlap ?? DEFAULT_OVERLAP, Math.floor(maxChars / 2)));

  const text = content.trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  // Split into atomic units (paragraphs, then sentences) we will never break.
  const units = text
    .split(/\n{2,}/)
    .flatMap((para) => para.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/))
    .map((u) => u.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const unit of units) {
    // A single unit longer than the window: hard-split it by characters.
    if (unit.length > maxChars) {
      pushCurrent();
      current = "";
      for (let i = 0; i < unit.length; i += maxChars - overlap) {
        chunks.push(unit.slice(i, i + maxChars).trim());
      }
      continue;
    }

    if (current && current.length + 1 + unit.length > maxChars) {
      pushCurrent();
      // Carry the tail of the previous chunk as overlap context.
      current = overlap > 0 ? current.slice(-overlap) + " " + unit : unit;
    } else {
      current = current ? current + " " + unit : unit;
    }
  }
  pushCurrent();

  return chunks.filter(Boolean);
}
