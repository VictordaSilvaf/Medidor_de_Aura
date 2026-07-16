export type OnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Cor de acento do slide (glow + progresso). */
  accent: string;
  /** Gradiente do orbe do slide. */
  orb: readonly [string, string, string];
  /** Slide que exibe a régua de raridades. */
  showTiers?: boolean;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'scan',
    eyebrow: 'Scan',
    title: 'Sua energia, quantificada',
    body: 'O medidor lê a frequência do seu momento e converte tudo em pontos de aura.',
    accent: '#6D5DFC',
    orb: ['#4438C9', '#6D5DFC', '#A78BFA'],
  },
  {
    id: 'tiers',
    eyebrow: 'Raridade',
    title: 'Seis tiers. Um é quase impossível.',
    body: 'De Comum a Cósmica — quanto mais rara a leitura, maior a pontuação.',
    accent: '#A855F7',
    orb: ['#7E22CE', '#A855F7', '#E879F9'],
    showTiers: true,
  },
  {
    id: 'farm',
    eyebrow: 'Farm',
    title: 'Farme aura. Compartilhe o drop.',
    body: 'Meça todos os dias, acumule pontos e mostre quando vier uma Lendária.',
    accent: '#EC4899',
    orb: ['#BE185D', '#EC4899', '#F9A8D4'],
  },
];
