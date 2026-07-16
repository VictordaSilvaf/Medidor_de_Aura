import { AURA_TIERS, type AuraTierId } from './tiers';

export type AuraResult = {
  tierId: AuraTierId;
  score: number;
  measuredAt: number;
};

/** Sorteio local ponderado por raridade — não há backend para isso. */
export function generateAura(): AuraResult {
  const totalWeight = AURA_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  let roll = Math.random() * totalWeight;

  let picked = AURA_TIERS[0];
  for (const tier of AURA_TIERS) {
    roll -= tier.weight;
    if (roll <= 0) {
      picked = tier;
      break;
    }
  }

  const [min, max] = picked.score;
  const score = min + Math.round(Math.random() * (max - min));

  return { tierId: picked.id, score, measuredAt: Date.now() };
}
