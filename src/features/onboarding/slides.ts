export type OnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  colors: readonly [string, string, string];
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'presence',
    eyebrow: 'Presença',
    title: 'Sinta o campo ao seu redor',
    body: 'O Medidor de Aura traduz o momento em uma leitura clara da sua energia.',
    colors: ['#0B1014', '#1A2A28', '#C4A574'],
  },
  {
    id: 'pulse',
    eyebrow: 'Ritmo',
    title: 'Acompanhe o pulso da sua aura',
    body: 'Veja como sua presença muda ao longo do dia e das semanas.',
    colors: ['#120E0C', '#3D2418', '#E8B86D'],
  },
  {
    id: 'insight',
    eyebrow: 'Clareza',
    title: 'Descubra o que a energia revela',
    body: 'Leituras e insights para entender padrões e agir com mais intenção.',
    colors: ['#0A0F12', '#1C3340', '#7EB8B2'],
  },
];
