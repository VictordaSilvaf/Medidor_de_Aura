# Aura analysis worker (serviço separado)

Poll em `video_analyses` com `status = queued`, processa o vídeo (stub IA por enquanto),
grava `video_analysis_results` e envia push via Expo.

## Setup local

```bash
cd worker
cp .env.example .env
# preencha SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev          # carrega .env + watch
# ou:
npm start            # produção local — exporte as vars ou use:
node --env-file=.env src/index.js
```

## Deploy no Railway

1. Crie um projeto em [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub** (repo Medidor_de_Aura).
2. No serviço, defina **Root Directory** = `worker`.
3. Railway detecta o `Dockerfile` / `railway.toml` automaticamente.
4. Em **Variables**, adicione:

| Var | Obrigatório | Uso |
|---|---|---|
| `SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Service role (nunca no app Expo) |
| `POLL_MS` | não | Intervalo do poll (default `4000`; use `1000` no início) |
| `R2_ACCOUNT_ID` | quando IA real | Download do vídeo |
| `R2_ACCESS_KEY_ID` | quando IA real | R2 |
| `R2_SECRET_ACCESS_KEY` | quando IA real | R2 |
| `R2_BUCKET_NAME` | quando IA real | ex. `medidor-de-aura-videos` |

5. Deploy. Nos logs deve aparecer: `[worker] polling every …ms`.

**CLI (opcional):**

```bash
cd worker
railway login
railway init          # linka o serviço
railway variables set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
railway up
```

Não precisa de domínio HTTP — este serviço só faz poll; não expõe porta.

## Trocar o stub pela IA real

Edite `src/process.js`:

1. Baixe o objeto R2 com `storage_key`
2. Extraia frames (ffmpeg)
3. Analise áudio
4. Analise movimentos
5. Calcule métricas → `tierId` + `score`
6. Retorne no mesmo formato `{ tierId, score, metrics, steps }`
