/**
 * Quote of the day for status display.
 */

interface Quote {
  text: string;
  attribution?: string;
}

const quotes: Quote[] = [
  { text: "Never miss twice.", attribution: "James Clear" },
  { text: "Do something, even if it's small." },
  { text: "1% better every day." },
  { text: "Action is the antidote to anxiety." },
  { text: "Be the person who does the thing." },
  {
    text: "Every rep is a vote for who you're becoming.",
    attribution: "James Clear",
  },
  { text: "Hard days are the point." },
  { text: "Comfort is the enemy of growth." },
  { text: "Do it afraid." },
  {
    text: "Sucking at something is the first step to being kind of good at it.",
    attribution: "Jake the Dog",
  },
  { text: "Show up. Do the work. Let go of the outcome." },
  { text: "You can always do more than nothing." },
  {
    text: "You are what you do, not what you say you'll do.",
    attribution: "Carl Jung",
  },
  {
    text: "The most terrifying thing is to accept oneself completely.",
    attribution: "Carl Jung",
  },
  {
    text: "No tree can grow to heaven unless its roots reach down to hell.",
    attribution: "Carl Jung",
  },
  {
    text: "There is no coming to consciousness without pain.",
    attribution: "Carl Jung",
  },
  {
    text: "Who looks outside, dreams. Who looks inside, awakes.",
    attribution: "Carl Jung",
  },
  {
    text: "Your vision will become clear only when you look into your heart.",
    attribution: "Carl Jung",
  },
  {
    text: "To love someone else is easy, but to love what you are, the thing that is yourself, is just as if you were embracing a glowing red-hot iron: it burns into you and that is very painful. Therefore, to love somebody else in the first place is always an escape which we all hope for, and we all enjoy it when we are capable of it. But in the long run, it comes back on us. You cannot stay away from yourself forever, you have to return, have to come to that experiment, to know whether you really can love. That is the question\u2014whether you can love yourself, and that will be the test.",
    attribution: "Carl Jung",
  },
  {
    text: "Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage.",
    attribution: "Rainer Maria Rilke",
  },
  {
    text: "The only journey is the one within.",
    attribution: "Rainer Maria Rilke",
  },
  {
    text: "Attention is the rarest and purest form of generosity.",
    attribution: "Simone Weil",
  },
  {
    text: "The most common form of despair is not being who you are.",
    attribution: "Kierkegaard",
  },
  {
    text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.",
    attribution: "Rumi",
  },
  {
    text: "The boundary to what we can accept is the boundary to our freedom.",
    attribution: "Tara Brach",
  },
];

/**
 * Wrap text to a maximum line width, breaking on word boundaries.
 * Returns an array of lines.
 */
function wordWrap(text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxWidth) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

/**
 * Simple deterministic hash for seeding permutations.
 */
function hashSeed(n: number): number {
  let h = n;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = ((h >> 16) ^ h) * 0x45d9f3b;
  h = (h >> 16) ^ h;
  return Math.abs(h);
}

/**
 * Get a deterministic permutation index for the given day.
 * Uses seeded Fisher-Yates to produce a different ordering each cycle.
 */
function getPermutedIndex(dayNumber: number, length: number): number {
  const cycle = Math.floor(dayNumber / length);
  const positionInCycle = dayNumber % length;

  const perm = Array.from({ length }, (_, i) => i);
  let seed = hashSeed(cycle);

  for (let i = length - 1; i > 0; i--) {
    seed = hashSeed(seed);
    const j = seed % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  return perm[positionInCycle];
}

/**
 * Format a quote with word-wrapping for display.
 * Short quotes return a single line, long ones wrap at ~76 chars
 * (accounting for 2-char indent + curly quotes).
 */
function formatQuote(quote: Quote): string {
  const attribution = quote.attribution ? ` \u2014 ${quote.attribution}` : "";
  const inner = quote.text;

  // For short quotes, single line
  const singleLine = `\u201c${inner}\u201d${attribution}`;
  if (singleLine.length <= 78) {
    return singleLine;
  }

  // Word-wrap the text, then add curly quotes and attribution
  const lines = wordWrap(inner, 76);
  const wrapped = lines.map((line, i) => {
    if (i === 0) return `\u201c${line}`;
    return ` ${line}`;
  });
  const lastIdx = wrapped.length - 1;
  wrapped[lastIdx] = `${wrapped[lastIdx]}\u201d`;

  if (attribution) {
    wrapped.push(attribution.trim());
  }

  return wrapped.join("\n   ");
}

/**
 * Get the quote of the day for the given date.
 * Same quote all day, cycles through all quotes before repeating.
 */
export function getQuoteOfTheDay(date: Date = new Date()): string {
  const dayNumber = Math.floor(date.getTime() / 86_400_000);
  const index = getPermutedIndex(dayNumber, quotes.length);
  return formatQuote(quotes[index]);
}
