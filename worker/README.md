# Aura analysis worker (serviço separado)

Poll em `video_analyses` com `status = queued`, processa o vídeo (stub IA por enquanto),
grava `video_analysis_results` e envia push via Expo.

## Setup

```bash
cd worker
cp .env.example .env
# preencha SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm install
npm start
```

## Deploy

Rode em Railway / Fly / Cloud Run / qualquer VM Node 20+.

Secrets necessários:

| Var | Uso |
|---|---|
| `SUPABASE_URL` | Projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (nunca no app) |
| `R2_*` | Download do vídeo (quando o stub virar worker real) |
| `POLL_MS` | Intervalo do poll (default 4000) |

## Trocar o stub pela IA real

Edite `src/process.js`:

1. Baixe o objeto R2 com `storage_key`
2. Extraia frames (ffmpeg)
3. Analise áudio
4. Analise movimentos
5. Calcule métricas → `tierId` + `score`
6. Retorne no mesmo formato `{ tierId, score, metrics, steps }`
