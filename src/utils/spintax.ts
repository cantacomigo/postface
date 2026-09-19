/**
 * Spintax Resolver & Text Variation Engine
 * Transforms strings like "{Olá|Oi|Bom dia} {amigos|pessoal}" into unique human-like posts.
 */

export function resolveSpintax(text: string): string {
  if (!text) return '';
  
  const regex = /\{([^{}]+)\}/g;
  let matchesFound = true;
  let result = text;

  // Loop to handle nested spintax like {Opção 1|{Opção 2A|Opção 2B}}
  let safetyLimit = 20;
  while (matchesFound && safetyLimit > 0) {
    safetyLimit--;
    const match = regex.exec(result);
    if (!match) {
      matchesFound = false;
      break;
    }
    
    result = result.replace(regex, (_, choicesStr) => {
      const choices = choicesStr.split('|');
      const randomChoice = choices[Math.floor(Math.random() * choices.length)];
      return randomChoice.trim();
    });
    
    // Reset regex position
    regex.lastIndex = 0;
  }

  return result;
}

/**
 * Calculates approximately how many unique post variations a spintax string can produce
 */
export function calculateVariationsCount(text: string): number {
  if (!text) return 1;
  const regex = /\{([^{}]+)\}/g;
  let match;
  let totalCombinations = 1;

  while ((match = regex.exec(text)) !== null) {
    const choices = match[1].split('|');
    if (choices.length > 1) {
      totalCombinations *= choices.length;
    }
  }

  return totalCombinations;
}

/**
 * Generates sample variations for previewing in UI
 */
export function generateSampleVariations(text: string, count: number = 3): string[] {
  const variations = new Set<string>();
  for (let i = 0; i < count * 5; i++) {
    variations.add(resolveSpintax(text));
    if (variations.size >= count) break;
  }
  return Array.from(variations);
}
