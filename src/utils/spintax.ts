/**
 * Spintax Resolver & Text Variation Engine
 * Transforms strings with simple or nested Spintax like:
 * "{Olá|Oi|{Bom dia|Boa tarde}} {amigos|{parceiros|colegas}}" into unique human-like posts.
 */

export function resolveSpintax(text: string): string {
  if (!text) return '';

  // Matches innermost {choice1|choice2|...} without containing nested braces
  const regex = /\{([^{}]+)\}/;
  let resolved = text;
  let safetyLimit = 100;

  while (regex.test(resolved) && safetyLimit > 0) {
    safetyLimit--;
    resolved = resolved.replace(regex, (_, choicesStr: string) => {
      const choices = choicesStr.split('|');
      const chosen = choices[Math.floor(Math.random() * choices.length)];
      return chosen !== undefined ? chosen.trim() : '';
    });
  }

  return resolved;
}

/**
 * Calculates approximately how many unique post variations a spintax string can produce,
 * properly handling nested brackets like {A|{B|C}} (= 3 options) * {X|Y} (= 2 options) = 6.
 */
export function calculateVariationsCount(text: string): number {
  if (!text) return 1;

  // We can calculate variations by reducing innermost braces to their numeric counts
  const regex = /\{([^{}]+)\}/;
  let working = text;
  let safetyLimit = 50;

  // Track top-level multipliers
  while (regex.test(working) && safetyLimit > 0) {
    safetyLimit--;
    working = working.replace(regex, (_, choicesStr: string) => {
      const choices = choicesStr.split('|');
      // Sum the values if nested already evaluated to numbers, or count 1 per literal choice
      let groupSum = 0;
      for (const choice of choices) {
        const trimmed = choice.trim();
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && String(num) === trimmed) {
          groupSum += num;
        } else {
          groupSum += 1;
        }
      }
      return String(Math.max(1, groupSum));
    });
  }

  // Multiply all remaining standalone counts from the text
  const numbersRegex = /\b\d+\b/g;
  let totalCombinations = 1;
  let match;
  let foundAny = false;

  while ((match = numbersRegex.exec(working)) !== null) {
    foundAny = true;
    totalCombinations *= Math.max(1, parseInt(match[0], 10));
  }

  return foundAny ? totalCombinations : 1;
}

/**
 * Generates sample variations for previewing in UI
 */
export function generateSampleVariations(text: string, count: number = 3): string[] {
  const variations = new Set<string>();
  for (let i = 0; i < count * 10; i++) {
    variations.add(resolveSpintax(text));
    if (variations.size >= count) break;
  }
  return Array.from(variations);
}
