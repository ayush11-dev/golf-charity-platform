function toTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

export function generateRandomDraw(): number[] {
  const picked = new Set<number>();

  while (picked.size < 5) {
    const value = Math.floor(Math.random() * 45) + 1;
    picked.add(value);
  }

  return [...picked].sort((a, b) => a - b);
}

export function generateAlgorithmicDraw(scores: number[]): number[] {
  const frequencies = new Map<number, number>();

  for (let value = 1; value <= 45; value += 1) {
    frequencies.set(value, 1);
  }

  for (const score of scores) {
    if (score >= 1 && score <= 45) {
      frequencies.set(score, (frequencies.get(score) ?? 1) + 1);
    }
  }

  const selected = new Set<number>();

  while (selected.size < 5) {
    const available = [] as Array<{ value: number; weight: number }>;
    let totalWeight = 0;

    for (let value = 1; value <= 45; value += 1) {
      if (selected.has(value)) {
        continue;
      }
      const weight = frequencies.get(value) ?? 1;
      available.push({ value, weight });
      totalWeight += weight;
    }

    let roll = Math.random() * totalWeight;
    for (const item of available) {
      roll -= item.weight;
      if (roll <= 0) {
        selected.add(item.value);
        break;
      }
    }
  }

  return [...selected].sort((a, b) => a - b);
}

export function checkMatch(
  userScores: number[],
  drawNumbers: number[],
): number {
  const drawSet = new Set(drawNumbers);
  let matches = 0;

  for (const score of userScores) {
    if (drawSet.has(score)) {
      matches += 1;
    }
  }

  if (matches >= 5) {
    return 5;
  }
  if (matches === 4) {
    return 4;
  }
  if (matches === 3) {
    return 3;
  }
  return 0;
}

export function calculatePrizePool(activeSubscriberCount: number): {
  total: number;
  jackpot: number;
  fourMatch: number;
  threeMatch: number;
} {
  const total = activeSubscriberCount * 999;
  const jackpot = total * 0.4;
  const fourMatch = total * 0.35;
  const threeMatch = total * 0.25;

  return {
    total: toTwoDecimals(total),
    jackpot: toTwoDecimals(jackpot),
    fourMatch: toTwoDecimals(fourMatch),
    threeMatch: toTwoDecimals(threeMatch),
  };
}

export function splitPrize(poolAmount: number, winnersCount: number): number {
  if (winnersCount <= 0) {
    return 0;
  }
  return toTwoDecimals(poolAmount / winnersCount);
}
