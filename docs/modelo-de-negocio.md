# 💼 Modelo de negócio — Medidor de Aura

> Documento vivo do produto: o que o app é, como gera valor, como pretende monetizar e o que já está implementado.  
> Atualizado em: **2026-07-16**

---

## 1. Visão do produto

**Medidor de Aura** é um app mobile de entretenimento social para **medir, farmar e compartilhar a “Aura”** de uma pessoa — vibe tech, neon e exclusividade (não místico/espiritual).

### Promessa

```
Scan → Reveal → Farm XP → Duel → Flex no feed
```

O momento central da experiência é a **revelação da aura** (orbe, glow, particles, tier + score). O resto do produto (perfil, feed, challenges, VIP) existe para fazer o usuário **voltar e compartilhar**.

### Posicionamento

| | |
|---|---|
| **Categoria** | Entretenimento + social + gamificação |
| **Referências de UX** | Linear, Discord Nitro, Nothing OS, Valorant UI |
| **Tom** | Premium, futurista, cyberpunk leve |
| **Não é** | App espiritual / wellness místico |

---

## 2. Proposta de valor

### Para o usuário free

- Descobrir a própria aura (vídeo ou farm local)
- Subir de nível, streak e XP
- Ver o feed e duelar ocasionalmente
- Compartilhar o resultado

### Para o usuário VIP

- **Mais análises de vídeo por dia/mês**
- **Prioridade na fila** de processamento
- Sensação de status (tiers de assinatura alinhados à lore do app)

### Para o negócio

- Assinatura recorrente (IAP / Stripe)
- Custos controlados por **cotas diárias + mensais** no servidor
- Free como funil; VIP como margem

---

## 3. Loop de produto (core loop)

```
1. Captura vídeo (câmera/galeria) ou farm local
2. Entra na fila de análise (prioridade por plano)
3. Worker processa → tier + score + XP
4. Revelação animada
5. Posta no feed / duel / challenge
6. Volta para farmar de novo (cota restante)
```

### Pipeline técnico (vídeo real)

```
Capture → Preview (público/privado)
  → Edge Function create-analysis (presigned R2)
  → Upload R2
  → confirm-upload → status queued
  → Worker (IA) → results + XP
  → Push (dev build) + tela de resultado
```

> Hoje o worker ainda é **stub** (métricas simuladas). O custo de IA real só aparece quando o stub for trocado.

---

## 4. Unidades de valor

| Unidade | O que é | Quem consome custo |
|---|---|---|
| **Análise de vídeo** | Upload + fila + worker + (futuro) IA | Alto (storage + compute + IA) |
| **Farm local / orbe** | Revelação client-side (sem vídeo) | Quase zero |
| **Feed / duelo / challenge** | Social + retenção | Baixo (DB) |
| **Prioridade na fila** | Tempo de espera menor | Custo de oportunidade, não direto |

**Insight de negócio:** vender **velocidade + volume limitado** é mais seguro do que vender “ilimitado”.

---

## 5. Modelo de monetização

### Canais de pagamento (arquitetura já prevista no código)

| Canal | Plataforma | Status |
|---|---|---|
| **RevenueCat** | iOS / Android (IAP) | Stub em `src/features/monetization/` |
| **Stripe** | Web | Stub |

Entitlements previstos no código (ainda genéricos):

- `premium_scan`
- `premium_insights`

### Planos alvo (negócio)

| Plano | Nome | Posicionamento |
|---|---|---|
| Free | Aprendiz | Começando a farmar |
| VIP 1 | 🥉 Ascendente | Começando a farmar de verdade |
| VIP 2 | 🥈 Lendário | Aura acima da média |
| VIP 3 | 🥇 Divino | Aura praticamente perfeita |

### Cotas propostas (sustentáveis / “se pagar”)

Objetivo: **o app pelo menos se pagar** quando a IA real entrar.  
Premissa de custo médio de análise: **~R$ 0,25 / vídeo** (ajustar quando o modelo de IA for escolhido).

| Plano | /dia | /mês | Fila | Preço alvo (BRL/mês)* |
|---|---|---|---|---|
| Free | 1 a cada 2–3 dias **ou** teto 5/mês | **3–5** | Normal (prioridade 0) | R$ 0 |
| 🥉 Ascendente | até **3** | **20** | Prioritária (10) | R$ 12–15 |
| 🥈 Lendário | até **6** | **50–60** | Alta (20) | R$ 25–30 |
| 🥇 Divino | até **20** | **120–150** | Máxima (30) | R$ 50–70 |

\*Preços são **hipótese de negócio**, não estão configurados em stores ainda.  
\*Impostos + taxa das stores (15–30%) entram na margem; usar preço final de vitrine acima do break-even bruto.

### Regra de break-even (por assinante)

```
Receita líquida do plano ≥ (cota máxima mensal × custo/vídeo) × 1,5
```

O `1,5` cobre free riders, suporte, falhas de retry e picos.

### O que NÃO fazer (custo explode)

- Free com 1 vídeo/dia sem teto mensal baixo (30 free heavy = prejuízo estrutural)
- VIP “ilimitado”
- Divino com 20+20/dia sem teto mensal duro
- Confiar cota só no app cliente (precisa hard cap no servidor)

---

## 6. Fila de análise (prioridade)

Todos os vídeos entram na **mesma fila** (`video_analyses.status = queued`).  
A diferença é o **peso de prioridade** ao escolher o próximo job:

| Plano | Prioridade |
|---|---|
| Free | 0 |
| Ascendente | 10 |
| Lendário | 20 |
| Divino | 30 |

### Regras

1. **Não interromper** análise já em `processing`
2. Prioridade só vale na **seleção do próximo** `queued`
3. Empate → FIFO (`created_at` mais antigo primeiro)
4. Cota diária/mensal é checada **antes** de criar a análise (Edge Function)

---

## 7. Estrutura de custos

| Item | Fase stub | Fase IA real |
|---|---|---|
| Supabase (Auth + DB + Edge) | Free / Pro | previsível |
| Cloudflare R2 (vídeo) | baixo | sobe com volume |
| Worker Node (Railway/Fly/etc.) | baixo | sobe com fila |
| **Modelo de IA** | R$ 0 | **principal custo variável** |
| Push Expo | quase zero | quase zero |
| Stores (Apple/Google) | — | 15–30% da receita IAP |

### Alavancas para manter custo baixo

1. Limitar duração/tamanho (já: ≤1 min, ≤50 MB)
2. Amostrar poucos frames (não analisar o vídeo inteiro frame a frame)
3. Modelo leve no Ascendente/Lendário; “análise premium” só no Divino (futuro)
4. Free magro + farm local sem upload
5. Apagar ou lifecycle de objetos R2 após N dias

---

## 8. Receita (hipótese)

### Assinatura

- Mensal (principal)
- Anual com desconto (melhor LTV; implementar depois)

### Futuro (não priorizar agora)

- Pack de créditos avulsos (“+5 análises”)
- Cosméticos de orbe / frame de perfil (baixo custo, alta margem)
- Boost de prioridade pontual (1 análise “na frente da fila”)

### Mix saudável (meta qualitativa)

- Free grande em número, **baixo uso de vídeo**
- Conversão VIP em quem já fez 1–2 revelações e quer farmar / flexar
- Divino = power users + status, não “todo mundo”

---

## 9. Métricas que importam

| Métrica | Por quê |
|---|---|
| **CAC** | Custo de aquisição por usuário |
| **Conversão Free → VIP** | Saúde do funil |
| **Vídeos / usuário / mês** | Custo variável real |
| **Custo médio / análise** | Define o preço mínimo |
| **Margem por plano** | Receita líquida − custo máximo do plano |
| **Fila p95 (minutos)** | Experiência VIP vs free |
| **Retenção D1 / D7 / D30** | Se o loop gruda |
| **Shares / resultado** | Viralidade orgânica |

---

## 10. O que já existe no produto (estado atual)

### Implementado

- Auth Supabase (email)
- Onboarding + splash + tema dark-first “Farmar Aura”
- Setup de perfil (username com maiúsculas)
- Tabs: Hub · Feed · Medir · Challenges · Perfil
- Pipeline de vídeo (capture → preview → R2 → fila → worker stub → result)
- Feed público + duelo + challenges (schema SQL)
- XP / level / streak (server truth no worker)
- i18n pt-BR / en / es
- Stubs RevenueCat + Stripe
- Farm local / revelação animada (orbe)

### Ainda não implementado (negócio)

- [ ] Planos VIP Ascendente / Lendário / Divino no app e nas stores
- [ ] Campo `subscription_tier` + sync RevenueCat → Supabase
- [ ] Cotas diárias/mensais enforced na Edge Function
- [ ] Prioridade na seleção da fila do worker
- [ ] Paywall / tela de upgrade
- [ ] IA real no worker (hoje stub)
- [ ] Lifecycle de arquivos R2
- [ ] Preços finais e produtos IAP configurados

---

## 11. Modelo de dados (quando implementar VIP)

Sugestão alinhada ao schema atual:

```text
profiles.subscription_tier   ∈ { free, ascendente, lendario, divino }
profiles.subscription_expires_at

video_analyses.priority      integer (0 / 10 / 20 / 30)
```

Contagem de uso:

- Por `user_id` + dia (UTC ou America/Sao_Paulo)
- Por `user_id` + mês calendário
- Fonte da verdade: **servidor** (Edge Function / RPC), nunca só o client

Fonte da assinatura:

- **RevenueCat** (mobile) → webhook → atualiza `profiles`
- **Stripe** (web) → webhook → mesma tabela

---

## 12. Princípios de negócio (guardrails)

1. **Se pagar primeiro** — crescimento depois; cotas antes de features caras  
2. **Free é demo**, não produto completo de vídeo  
3. **VIP compra prioridade + volume limitado**, não ilimitado  
4. **Hard cap no servidor** sempre  
5. **Custo de IA medido** antes de subir cotas  
6. **Status e lore** (Ascendente / Lendário / Divino) vendem tanto quanto o número de vídeos  

---

## 13. Próximos passos recomendados

1. Fechar preços e cotas finais (tabela da seção 5)  
2. Migration: `subscription_tier` + `priority`  
3. Enforce de cota em `create-analysis`  
4. Worker: `ORDER BY priority DESC, created_at ASC`  
5. Paywall no fluxo “Medir” quando cota acabar  
6. Só então plugar IA real com telemetria de custo por job  

---

## 14. Resumo em uma frase

> **Medidor de Aura** monetiza assinaturas VIP que compram **mais análises de vídeo e fila prioritária**, com free magro e tetos duros para o custo de IA nunca passar da receita.
