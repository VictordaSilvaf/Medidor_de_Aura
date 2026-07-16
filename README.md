# Medidor de Aura

App Expo (SDK 57) com base enterprise: Expo Router, Redux Toolkit + Persist (AsyncStorage), TanStack Query, Supabase Auth, Gluestack UI v5 + NativeWind v5, Axios, React Hook Form + Zod.

## Design system "Farmar Aura"

Identidade dark-first, premium e futurista (tema padrão: escuro; claro disponível no toggle da home).

- **Tokens**: paleta em `global.css` (base `#09090B`, primária `#6D5DFC`, gradiente `#6D5DFC → #A855F7 → #EC4899`) e em `src/shared/ui/theme.ts` para estilos inline/Reanimated.
- **Tipografia**: Space Grotesk (`@expo-google-fonts/space-grotesk`), carregada em `app/_layout.tsx` segurando a splash.
- **Componentes**: `src/shared/ui/` — `AuraOrb` (orbe animado, assinatura do app), `AuraParticles`, `GradientButton` (radius 18, glow), `GlowCard` (borda branca 8%, glass opcional via expo-blur).
- **Ícones**: `lucide-react-native` (outline, minimalista).
- **Experiência central**: `app/(app)/measure.tsx` — scan com suspense, revelação do tier (Comum → Cósmica, sorteio local ponderado em `src/features/aura/`), pontuação com count-up e compartilhamento via Share API. Farm (total, medições, melhor tier) persiste no slice `aura`.

## Pré-requisitos

- Node 18+
- Conta [Supabase](https://supabase.com) (Auth)
- Funciona no **Expo Go** e em development builds

## Setup

```bash
yarn install
cp .env.example .env
```

Preencha no `.env`:

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_KEY` | Publishable/anon key (dashboard Expo) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (opcional) alias da mesma key |
| `EXPO_PUBLIC_API_URL` | (opcional) Base URL do Axios |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (futuro) Stripe |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_*` | (futuro) RevenueCat iOS/Android |

Client em `src/features/auth/supabase.ts` (Secure Store, não AsyncStorage). Não coloque senha do banco no app.

No Supabase: Authentication → Providers → Email habilitado.

```bash
yarn start
```

> No Linux, o React Native DevTools (Electron) fica desativado automaticamente (bug de path com espaço). Para depurar, pressione `j` no terminal do Expo e use o Chrome.
>
> **Rozenite** (Network, Performance, Navigation, Redux, Storage) fica ativo com `yarn start` (`WITH_ROZENITE=true`). Painéis aparecem no React Native DevTools.

## Arquitetura rápida

- `app/` — rotas Expo Router. `(auth)` públicas; `(app)` exige login.
- `src/core` — store Redux, hooks tipados e AppProviders.
- `src/features/auth` — Supabase + slice Redux (sessão espelhada).
- `src/features/prefs` — preferências persistidas (AsyncStorage).
- `src/features/monetization` — port + adapters stub (RevenueCat / Stripe).
- `src/shared/api` — Axios (Bearer Supabase) + React Query.
- `components/ui` — Gluestack UI (copy-paste).

**Estado:** React Query = servidor; Redux = UI/session mirror/prefs.

> Não use a pasta `src/app` — o Expo Router a trata como raiz de rotas.

## Pagamentos (ainda stubs)

```ts
import { getMonetization } from '@/src/features/monetization';

// iOS/Android → RevenueCat; web → Stripe
await getMonetization().purchase('premium_monthly');
```

Plugue os SDKs quando for implementar cobrança real — a interface já está pronta.

## Adicionar componentes Gluestack

```bash
npx gluestack-ui@latest add <component>
```
