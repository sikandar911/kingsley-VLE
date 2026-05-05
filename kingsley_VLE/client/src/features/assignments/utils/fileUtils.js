// ── Word counting utilities ───────────────────────────────────────────────

/**
 * Count words in plain text
 */
export const countWords = (text) => {
  if (!text || typeof text !== "string") return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

/**
 * Count words in HTML (strips tags first)
 */
export const countWordsInHtml = (html) => {
  if (!html) return 0;
  const plainText = html.replace(/<[^>]*>/g, " ");
  return countWords(plainText);
};
