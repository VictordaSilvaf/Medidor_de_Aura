# ⚡ Medidor de Aura

> **Farm aura. Suba de nível. Duelos. Flex no feed.**  
> App mobile premium para medir e compartilhar a “Aura” de alguém — vibe tech, neon e exclusividade (não místico).

```
🌑 Scan → ✨ Reveal → 📈 Farm XP → ⚔️ Duel → 🏆 Rank
```

| | |
|---|---|
| **Stack** | Expo SDK 57 · Expo Router · TypeScript |
| **UI** | NativeWind v5 · Gluestack UI v5 · Space Grotesk |
| **Estado** | Redux Toolkit + Persist · TanStack Query |
| **Backend** | Supabase (Auth · Postgres · Edge Functions · Realtime) |
| **Mídia** | Cloudflare R2 + worker de análise |

---

## 🎮 O que você farmar aqui

| Feature | Drop |
|---|---|
| 🔮 **Medição de aura** | Captura / galeria → upload → IA/worker → tier + score |
| 🌀 **Revelação** | Orbe, glow, partículas — o momento “lendário” |
| 📊 **Hub / XP** | Level, streak, total de aura, melhor tier |
| 📰 **Feed** | Posts públicos + desafio de **duelo** |
| 🏆 **Challenges** | Weekly · monthly · seasonal · duel · community · tier hunt · streak |
| 👤 **Perfil social** | Username (maiúsculas ok), bio, privacidade |
| 🌍 **i18n** | `pt-BR` · `en` · `es` |
| 🌙 **Tema** | Dark-first (Farmar Aura) + toggle claro |

### 🌈 Tiers de aura

| Tier | Cor | Vibes |
|---|---|---|
| Comum | `#94A3B8` | Drop base |
| Rara | `#38BDF8` | Já brilha |
| Épica | `#10B981` | Respeito |
| Lendária | `#FACC15` | Flex |
| Divina | `#FB7185` | Quase mito |
| Cósmica | `#A855F7` | Jackpot |

---

## ✅ Pré-requisitos

- 🟢 **Node LTS** (`nvm use` — o repo tem `.nvmrc` com `lts/*`)
- 🧶 **Yarn**
- 📱 **Expo Go** (UI/auth/farm local) **ou** Dev Build (câmera + push reais)
- 🗄️ Conta [Supabase](https://supabase.com)
- ☁️ Conta Cloudflare R2 (pipeline de vídeo)
- 🛠️ [Supabase CLI](https://supabase.com/docs/guides/cli) (migrations / functions)

> ⚠️ Push remoto **não** roda no Expo Go Android (SDK 53+). Use `yarn android` / EAS Dev Client para testar notificações.

---

## 🚀 Como rodar (quest inicial)

### 1️⃣ Clone & dependências

```bash
git clone <repo>
cd Medidor_de_Aura
nvm install --lts && nvm use
yarn install
cp .env.example .env
```

### 2️⃣ Variáveis do app (`.env`)

| Variável | Pra quê |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL do projeto |
| `EXPO_PUBLIC_SUPABASE_KEY` | Publishable / anon key |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | (opcional) alias da mesma key |
| `EXPO_PUBLIC_API_URL` | (opcional) base Axios |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Push Expo (após `eas init`) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stub monetização |
| `EXPO_PUBLIC_REVENUECAT_API_KEY_*` | Stub monetização |

### 3️⃣ Suba o Metro

```bash
yarn start          # Expo + Rozenite DevTools
yarn android        # Dev build Android
yarn ios            # Dev build iOS
yarn lint
```

Fluxo no device:

```
Splash → Onboarding → Login/Register → Setup username → Tabs
```

> No Linux, se o DevTools Electron falhar: pressione `j` no terminal e use o Chrome. Rozenite (Network · Performance · Nav · Redux · Storage) sobe com `WITH_ROZENITE=true`.

---

## 🗄️ Supabase (o boss fight do backend)

### O que mora no `supabase/`

| Peça | Função |
|---|---|
| `migrations/` | Schema, RLS, seeds de challenges |
| `functions/create-analysis` | Cria análise + URL presigned R2 |
| `functions/confirm-upload` | Confirma upload → fila `queued` |
| `config.toml` | Config local do projeto |

### Migrations (ordem)

1. `20260716140000_video_analyses.sql` — pipeline de vídeo, resultados, push tokens  
2. `20260716150000_profiles_challenges_feed.sql` — profiles, XP, feed, challenges  
3. `20260716153000_username_allow_uppercase.sql` — username com maiúsculas + unique case-insensitive  

### Aplicar no projeto remoto

```bash
# link (uma vez)
supabase link --project-ref <seu-ref>

# sobe migrations
supabase db push

# Edge Functions
supabase secrets set \
  R2_ACCOUNT_ID=... \
  R2_ACCESS_KEY_ID=... \
  R2_SECRET_ACCESS_KEY=... \
  R2_BUCKET_NAME=medidor-de-aura-videos \
  SUPABASE_SERVICE_ROLE_KEY=...

supabase functions deploy create-analysis confirm-upload
```

Ou cole o SQL no **SQL Editor** do dashboard (na ordem das migrations).

### Auth

No dashboard: **Authentication → Providers → Email** habilitado.  
Sessão no app via Secure Store (`src/features/auth/supabase.ts`) — **não** coloque a `service_role` no client.

### Tabelas principais

| Tabela | Lore |
|---|---|
| `profiles` | Username, display name, level, XP, streak, aura |
| `video_analyses` | Fila: pending_upload → … → completed / failed |
| `video_analysis_results` | Tier + score + metrics |
| `device_push_tokens` | Tokens Expo Push |
| Challenges / feed / duels | Ver migration de social |

RLS está ligado: cada user só mexe no que é dele (e vê o que é público no feed).

### Secrets só no server

Nunca no app — só Edge Functions / `worker/`:

- `SUPABASE_SERVICE_ROLE_KEY`
- Credenciais R2 (`R2_*`)

---

## 🎬 Pipeline de vídeo (como a aura nasce)

```
📱 Capture / Galeria (≤1 min · ≤50 MB · H.264/MP4 ou MOV)
    ↓
👀 Preview (Público / Privado · usar / descartar)
    ↓
☁️ create-analysis → upload R2 (presigned)
    ↓
✅ confirm-upload → status queued
    ↓
🤖 worker/ (consome fila → métricas → tier/score → XP)
    ↓
✨ Resultado + 🔔 push (dev build)
```

| Peça | Onde |
|---|---|
| Telas | `capture` · `preview` · `processing/[id]` · `result/[id]` |
| Feature | `src/features/video-analysis/` |
| Worker | `worker/` (Node separado — ver `worker/README.md`) |

Worker local:

```bash
cd worker
cp .env.example .env   # SUPABASE_URL + SERVICE_ROLE_KEY
npm install && npm run dev
# produção local: node --env-file=.env src/index.js
```

Deploy (Railway): Root Directory = `worker`, variables no dashboard — detalhes em `worker/README.md`.

---

## 🗺️ Estrutura do repo

```
Medidor_de_Aura/
├── app/                      # 🧭 Rotas Expo Router
│   ├── splash.tsx
│   ├── (onboarding)/
│   ├── (auth)/               # login · register
│   └── (app)/                # 🔒 precisa de sessão
│       ├── (tabs)/           # Hub · Feed · Medir · Challenges · Perfil
│       ├── capture · preview · measure
│       ├── processing/[id] · result/[id]
│       ├── profile/setup · edit
│       └── challenges/[id] · post/[id]
├── src/
│   ├── core/                 # store · providers · hooks
│   ├── features/
│   │   ├── auth/             # Supabase Auth + Redux session
│   │   ├── aura/             # farm / tiers locais
│   │   ├── social/           # profile · feed · challenges
│   │   ├── video-analysis/   # captura · upload · push
│   │   ├── prefs/            # tema · onboarding · visibilidade
│   │   └── monetization/     # stubs Stripe / RevenueCat
│   └── shared/               # ui · i18n · config · storage · api
├── components/ui/            # Gluestack copiado
├── supabase/
│   ├── migrations/
│   └── functions/
├── worker/                   # processador da fila
└── global.css                # tokens Farmar Aura
```

### Estado (quem manda o quê)

| Camada | Responsabilidade |
|---|---|
| **React Query** | Dados do servidor (feed, challenges, análises) |
| **Redux + Persist** | Sessão espelhada · prefs · pending capture · farm local |

---

## 🎨 Design system “Farmar Aura”

Dark mode default. Visual limpo, glow roxo, gradiente `#6D5DFC → #A855F7 → #EC4899`.

| Item | Onde |
|---|---|
| Tokens CSS | `global.css` |
| Theme JS | `src/shared/ui/theme.ts` |
| Assinatura UI | `AuraOrb` · `AuraParticles` · `GradientButton` · `GlowCard` |

Inspiração: Linear · Raycast · Discord Nitro · Nothing OS — cyberpunk leve, sem misticismo.

---

## 🧪 DevTools & qualidade

```bash
yarn start   # Rozenite ligado
yarn lint
npx tsc --noEmit
```

- `j` no Expo CLI → Chrome DevTools  
- Painéis Rozenite: Network · Performance · Navigation · Redux · Storage  

---

## 🏁 Checklist rápido (speedrun)

- [ ] `nvm use` + `yarn install`
- [ ] `.env` com URL + key Supabase
- [ ] `supabase db push` (3 migrations)
- [ ] Secrets R2 + deploy das Edge Functions
- [ ] Worker rodando (para completar análises)
- [ ] `yarn start` → conta → username → medir aura ✨

---

## 📜 Licença

Privado / uso do projeto. Ajuste conforme o time.
