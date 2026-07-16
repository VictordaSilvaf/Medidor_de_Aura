# Medidor de Aura

App Expo (SDK 57) com base enterprise: Expo Router, Redux Toolkit + Persist (AsyncStorage), TanStack Query, Supabase Auth, Gluestack UI v5 + NativeWind v5, Axios, React Hook Form + Zod.

## Pipeline de vídeo (aura real)

```
Home → Capture (permissões + countdown + galeria ≤1min/50MB)
     → Preview (usar / descartar)
     → Upload R2 (presigned via Edge Function)
     → video_analyses (queued)
     → Worker separado (IA stub → métricas → tier/score)
     → Resultado + push Expo
```

| Peça | Onde |
|---|---|
| Captura / preview / processing / result | `app/(app)/capture.tsx`, `preview.tsx`, `processing/[id].tsx`, `result/[id].tsx` |
| Feature | `src/features/video-analysis/` |
| Schema + RLS | `supabase/migrations/` |
| Edge Functions | `supabase/functions/create-analysis`, `confirm-upload` |
| Worker | `worker/` (serviço Node separado) |

Formato: H.264 preferencialmente em MP4; MOV (QuickTime) também aceito (iOS).

### Deploy backend

1. Aplique a migration no Supabase.
2. Configure secrets R2 + service role nas Edge Functions.
3. `supabase functions deploy create-analysis confirm-upload`
4. Suba o `worker/` com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
5. Preencha `EXPO_PUBLIC_EAS_PROJECT_ID` (e `app.json` → `extra.eas.projectId`) para push.

## Design system "Farmar Aura"

Identidade dark-first, premium e futurista (tema padrão: escuro; claro disponível no toggle da home).

- **Tokens**: paleta em `global.css` e `src/shared/ui/theme.ts`.
- **Tipografia**: Space Grotesk.
- **Componentes**: `src/shared/ui/` — `AuraOrb`, `AuraParticles`, `GradientButton`, `GlowCard`.

## Pré-requisitos

- Node 18+
- Conta Supabase (Auth + DB)
- Conta Cloudflare R2 (upload)
- **Dev build** recomendado para câmera + push (não só Expo Go)

## Setup

```bash
yarn install
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `EXPO_PUBLIC_SUPABASE_KEY` | Publishable/anon key |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Project id EAS (push) |
| `EXPO_PUBLIC_API_URL` | (opcional) Base URL do Axios |

```bash
yarn start
```

## Arquitetura rápida

- `app/` — rotas Expo Router. `(auth)` públicas; `(app)` exige login.
- `src/core` — store Redux, hooks tipados e AppProviders.
- `src/features/auth` — Supabase + slice Redux.
- `src/features/video-analysis` — captura, upload R2, realtime, push.
- `src/features/aura` — farm local (total/medições/melhor tier) alimentado pelos resultados do worker.
- `worker/` — processo separado de análise.

**Estado:** React Query = servidor; Redux = UI/session mirror/prefs + pending capture.
