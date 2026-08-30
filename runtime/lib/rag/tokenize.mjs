const STOP_WORDS = new Set([
  "the", "is", "a", "an", "and", "or", "in", "of", "to", "for", "with", "on",
  "at", "by", "this", "that", "it", "from", "as", "are", "be", "was", "were",
  "but", "not", "he", "she", "they", "them", "his", "her", "their", "you",
  "your", "we", "our", "can", "could", "would", "should", "will", "shall",
  "may", "might", "must", "do", "does", "did", "have", "has", "had", "been",
  "being", "am", "what", "which", "who", "whom", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "only", "own", "same", "so", "than", "too", "very",
  "just", "also", "into", "about", "over", "after", "before", "between",
  "through", "during", "without", "within", "along", "while", "me", "my",
  "mine", "us", "its", "if", "then", "else", "because", "until", "since",
]);

const SUFFIX_RULES = [
  [/isation$/, "ize"],
  [/ization$/, "ize"],
  [/ies$/, "y"],
  [/ied$/, "y"],
  [/ing$/, ""],
  [/ed$/, ""],
  [/es$/, ""],
  [/s$/, ""],
];

export function stemWord(word) {
  if (word.length <= 4) return word;
  for (const [pattern, replacement] of SUFFIX_RULES) {
    if (pattern.test(word)) {
      const stemmed = word.replace(pattern, replacement);
      if (stemmed.length >= 3) return stemmed;
    }
  }
  return word;
}

export function normalizeText(input) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input, options = {}) {
  const stem = options.stem ?? true;
  const normalized = normalizeText(input);
  if (!normalized) return [];

  const seen = new Set();
  const tokens = [];

  for (const raw of normalized.split(" ")) {
    if (raw.length < 2 || raw.length > 30) continue;
    if (STOP_WORDS.has(raw)) continue;
    const token = stem ? stemWord(raw) : raw;
    if (token.length < 2 || seen.has(token)) continue;
    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}

export { STOP_WORDS };
