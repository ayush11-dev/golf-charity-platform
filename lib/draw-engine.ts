function toTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

const MIN_SCORE = 1;
const MAX_SCORE = 45;
const DRAW_SIZE = 5;

type TierWinners = {
  fiveMatch: string[];
  fourMatch: string[];
  threeMatch: string[];
};

type WinnerRange = {
  min: number;
  max: number;
};

const WINNER_TARGETS: {
  fiveMatch: WinnerRange;
  fourMatch: WinnerRange;
  threeMatch: WinnerRange;
} = {
  fiveMatch: { min: 1, max: 2 },
  fourMatch: { min: 3, max: 4 },
  threeMatch: { min: 5, max: 6 },
};

function isValidScore(value: number) {
  return Number.isFinite(value) && value >= MIN_SCORE && value <= MAX_SCORE;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sortNumbers(values: number[]) {
  return [...values].sort((a, b) => a - b);
}

function fillWithRandomNumbers(baseValues: number[]): number[] {
  const picked = new Set(baseValues.filter((value) => isValidScore(value)));

  while (picked.size < DRAW_SIZE) {
    picked.add(randomInt(MIN_SCORE, MAX_SCORE));
  }

  return sortNumbers([...picked].slice(0, DRAW_SIZE));
}

function normalizeDrawNumbers(values: number[]): number[] {
  const unique = new Set<number>();

  for (const value of values) {
    if (isValidScore(value)) {
      unique.add(value);
    }
  }

  const normalized = [...unique].slice(0, DRAW_SIZE);
  return fillWithRandomNumbers(normalized);
}

function evaluateTierWinners(
  drawNumbers: number[],
  allUserScores: Map<string, number[]>,
): TierWinners {
  const winners: TierWinners = {
    fiveMatch: [],
    fourMatch: [],
    threeMatch: [],
  };

  for (const [userId, scores] of allUserScores.entries()) {
    const matchType = checkMatch(scores, drawNumbers);
    if (matchType === 5) {
      winners.fiveMatch.push(userId);
    } else if (matchType === 4) {
      winners.fourMatch.push(userId);
    } else if (matchType === 3) {
      winners.threeMatch.push(userId);
    }
  }

  return winners;
}

function countPenalty(count: number, range: WinnerRange) {
  if (count < range.min) {
    return range.min - count;
  }
  if (count > range.max) {
    return count - range.max;
  }
  return 0;
}

function scoreWinnersByTarget(winners: TierWinners) {
  const fiveCount = winners.fiveMatch.length;
  const fourCount = winners.fourMatch.length;
  const threeCount = winners.threeMatch.length;

  const fivePenalty = countPenalty(fiveCount, WINNER_TARGETS.fiveMatch);
  const fourPenalty = countPenalty(fourCount, WINNER_TARGETS.fourMatch);
  const threePenalty = countPenalty(threeCount, WINNER_TARGETS.threeMatch);

  const totalPenalty = fivePenalty * 100 + fourPenalty * 25 + threePenalty * 5;
  const distanceToBandCenter =
    Math.abs(fiveCount - 1.5) +
    Math.abs(fourCount - 3.5) +
    Math.abs(threeCount - 5.5);

  return {
    totalPenalty,
    distanceToBandCenter,
    totalWinners: fiveCount + fourCount + threeCount,
    isPerfect: totalPenalty === 0,
  };
}

function collectScorePool(allUserScores: Map<string, number[]>) {
  const scorePool = new Set<number>();

  for (const scores of allUserScores.values()) {
    for (const value of scores) {
      if (isValidScore(value)) {
        scorePool.add(value);
      }
    }
  }

  return [...scorePool];
}

function buildRandomCandidate(scorePool: number[]) {
  const selected = new Set<number>();

  while (selected.size < DRAW_SIZE) {
    const useScorePool = scorePool.length > 0 && Math.random() < 0.85;
    const value = useScorePool
      ? scorePool[randomInt(0, scorePool.length - 1)]
      : randomInt(MIN_SCORE, MAX_SCORE);

    selected.add(value);
  }

  return normalizeDrawNumbers([...selected]);
}

function mutateCandidate(baseNumbers: number[], scorePool: number[]) {
  const trial = [...baseNumbers];
  const mutationCount = randomInt(1, 3);

  for (let step = 0; step < mutationCount; step += 1) {
    const index = randomInt(0, DRAW_SIZE - 1);
    const useScorePool = scorePool.length > 0 && Math.random() < 0.8;
    trial[index] = useScorePool
      ? scorePool[randomInt(0, scorePool.length - 1)]
      : randomInt(MIN_SCORE, MAX_SCORE);
  }

  return normalizeDrawNumbers(trial);
}

function capWinners(userIds: string[], maxWinners: number) {
  if (userIds.length <= maxWinners) {
    return [...userIds];
  }

  const shuffled = [...userIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    const current = shuffled[index];
    shuffled[index] = shuffled[swapIndex];
    shuffled[swapIndex] = current;
  }

  return shuffled.slice(0, maxWinners);
}

function findBestAdjustedNumbers(
  baseNumbers: number[],
  allUserScores: Map<string, number[]>,
  attempts = 20000,
) {
  const pool = collectScorePool(allUserScores);

  let bestNumbers = normalizeDrawNumbers(baseNumbers);
  let bestWinners = evaluateTierWinners(bestNumbers, allUserScores);
  let bestScore = scoreWinnersByTarget(bestWinners);

  if (bestScore.isPerfect) {
    return { numbers: bestNumbers, winners: bestWinners };
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const trialNumbers =
      attempt % 4 === 0
        ? buildRandomCandidate(pool)
        : mutateCandidate(bestNumbers, pool);

    const trialWinners = evaluateTierWinners(trialNumbers, allUserScores);
    const trialScore = scoreWinnersByTarget(trialWinners);

    const isBetter =
      trialScore.totalPenalty < bestScore.totalPenalty ||
      (trialScore.totalPenalty === bestScore.totalPenalty &&
        trialScore.distanceToBandCenter < bestScore.distanceToBandCenter) ||
      (trialScore.totalPenalty === bestScore.totalPenalty &&
        trialScore.distanceToBandCenter === bestScore.distanceToBandCenter &&
        trialScore.totalWinners < bestScore.totalWinners);

    if (isBetter) {
      bestNumbers = trialNumbers;
      bestWinners = trialWinners;
      bestScore = trialScore;

      if (bestScore.isPerfect) {
        return { numbers: bestNumbers, winners: bestWinners };
      }
    }
  }

  return { numbers: bestNumbers, winners: bestWinners };
}

export function generateScoreBasedRandomDraw(
  allUserScores: Map<string, number[]>,
): number[] {
  const uniqueScores = new Set<number>();

  for (const scores of allUserScores.values()) {
    for (const score of scores) {
      if (isValidScore(score)) {
        uniqueScores.add(score);
      }
    }
  }

  const source = [...uniqueScores];
  const selected = new Set<number>();

  while (selected.size < DRAW_SIZE && source.length > 0) {
    const index = randomInt(0, source.length - 1);
    const [value] = source.splice(index, 1);
    selected.add(value);
  }

  return fillWithRandomNumbers([...selected]);
}

export function generateScoreBasedAlgorithmicDraw(
  allUserScores: Map<string, number[]>,
): number[] {
  const frequencies = new Map<number, number>();

  for (const scores of allUserScores.values()) {
    for (const score of scores) {
      if (isValidScore(score)) {
        frequencies.set(score, (frequencies.get(score) ?? 0) + 1);
      }
    }
  }

  const availableValues = [...frequencies.keys()];
  const selected = new Set<number>();

  while (selected.size < DRAW_SIZE && availableValues.length > 0) {
    let totalWeight = 0;
    for (const value of availableValues) {
      totalWeight += frequencies.get(value) ?? 0;
    }

    if (totalWeight <= 0) {
      break;
    }

    let roll = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let index = 0; index < availableValues.length; index += 1) {
      const value = availableValues[index];
      roll -= frequencies.get(value) ?? 0;
      if (roll <= 0) {
        selectedIndex = index;
        break;
      }
    }

    const [picked] = availableValues.splice(selectedIndex, 1);
    selected.add(picked);
  }

  return fillWithRandomNumbers([...selected]);
}

export function checkMatch(
  userScores: number[],
  drawNumbers: number[],
): number {
  const drawSet = new Set(drawNumbers);
  const uniqueUserScores = new Set(
    userScores.filter((score) => isValidScore(score)),
  );
  let matches = 0;

  for (const score of uniqueUserScores) {
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

export function guaranteeWinners(
  drawnNumbers: number[],
  allUserScores: Map<string, number[]>,
): {
  adjustedNumbers: number[];
  fiveMatch: string[];
  fourMatch: string[];
  threeMatch: string[];
} {
  const searched = findBestAdjustedNumbers(drawnNumbers, allUserScores);
  const adjustedNumbers = searched.numbers;
  const winners = searched.winners;

  const fiveMatch = capWinners(winners.fiveMatch, WINNER_TARGETS.fiveMatch.max);
  const fourMatch = capWinners(winners.fourMatch, WINNER_TARGETS.fourMatch.max);
  const threeMatch = capWinners(
    winners.threeMatch,
    WINNER_TARGETS.threeMatch.max,
  );

  return {
    adjustedNumbers,
    fiveMatch,
    fourMatch,
    threeMatch,
  };
}
