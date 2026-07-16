export type AuraTierId =
  | 'comum'
  | 'rara'
  | 'epica'
  | 'lendaria'
  | 'divina'
  | 'cosmica';

export type AuraTier = {
  id: AuraTierId;
  label: string;
  /** Cor de identidade do tier. */
  color: string;
  /** Gradiente do orbe na revelação. */
  gradient: readonly [string, string, string];
  /** Peso relativo no sorteio (soma não precisa dar 100). */
  weight: number;
  /** Faixa de pontuação [min, max]. */
  score: readonly [number, number];
  /** Frase curta exibida no card de resultado. */
  tagline: string;
};

export const AURA_TIERS: readonly AuraTier[] = [
  {
    id: 'comum',
    label: 'Comum',
    color: '#94A3B8',
    gradient: ['#64748B', '#94A3B8', '#CBD5E1'],
    weight: 45,
    score: [12, 120],
    tagline: 'Energia estável. Todo farm começa aqui.',
  },
  {
    id: 'rara',
    label: 'Rara',
    color: '#38BDF8',
    gradient: ['#0284C7', '#38BDF8', '#7DD3FC'],
    weight: 26,
    score: [130, 320],
    tagline: 'Frequência acima da média detectada.',
  },
  {
    id: 'epica',
    label: 'Épica',
    color: '#10B981',
    gradient: ['#047857', '#10B981', '#6EE7B7'],
    weight: 15,
    score: [340, 580],
    tagline: 'Campo de energia fora da curva.',
  },
  {
    id: 'lendaria',
    label: 'Lendária',
    color: '#FACC15',
    gradient: ['#D97706', '#FACC15', '#FEF08A'],
    weight: 9,
    score: [600, 820],
    tagline: 'Leitura no limite dos sensores.',
  },
  {
    id: 'divina',
    label: 'Divina',
    color: '#FB7185',
    gradient: ['#E11D48', '#FB7185', '#FDA4AF'],
    weight: 4,
    score: [840, 970],
    tagline: 'Assinatura energética quase impossível.',
  },
  {
    id: 'cosmica',
    label: 'Cósmica',
    color: '#A855F7',
    gradient: ['#6D5DFC', '#A855F7', '#EC4899'],
    weight: 1,
    score: [999, 999],
    tagline: 'O medidor não foi feito para isso.',
  },
] as const;

export const TIER_BY_ID: Record<AuraTierId, AuraTier> = Object.fromEntries(
  AURA_TIERS.map((tier) => [tier.id, tier]),
) as Record<AuraTierId, AuraTier>;

const TIER_ORDER: AuraTierId[] = AURA_TIERS.map((tier) => tier.id);

export function compareTiers(a: AuraTierId, b: AuraTierId): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

/** Chance percentual (aprox.) de um tier, para exibir no card. */
export function tierChance(id: AuraTierId): number {
  const total = AURA_TIERS.reduce((sum, tier) => sum + tier.weight, 0);
  return Math.round((TIER_BY_ID[id].weight / total) * 100);
}
