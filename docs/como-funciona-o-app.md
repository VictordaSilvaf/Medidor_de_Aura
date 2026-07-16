# 📱 Como funciona o app — Medidor de Aura

> Guia de usabilidade: fluxos, telas, permissões e o que o usuário realmente consegue fazer hoje.  
> Complementa o [modelo de negócio](./modelo-de-negocio.md).  
> Atualizado em: **2026-07-16**

---

## 1. Em uma frase

O app leva a pessoa do **primeiro contato** até **medir a aura por vídeo**, revelar o tier, farmar XP e (opcionalmente) **aparecer no feed / duelar / entrar em challenges**.

```
Splash → Onboarding → Conta → Username → Hub
                              ↓
                    Medir (vídeo) → Reveal → Social
```

---

## 2. Jornada completa (primeira vez)

| Passo | Tela | O que acontece |
|---|---|---|
| 1 | **Splash** | Orbe + “MEDIDOR DE AURA” / “Energia quantificada” (~2,6s) |
| 2 | **Onboarding** | 3 stories (scan · tiers · farm). Tap esquerda/direita, “Pular” ou “Começar a farmar” |
| 3 | **Login / Criar conta** | E-mail + senha (Supabase Auth) |
| 4 | **Setup de perfil** | Nome + **username** (letras maiúsculas ok, 3–24 chars, `_` permitido) — obrigatório, sem voltar |
| 5 | **Hub** | Home do farm: stats, orbe, CTA “Medir aura” |

Nas próximas aberturas:

- Onboarding já feito → pula  
- Sessão válida → vai direto ao app (ou setup, se ainda não tiver username)

---

## 3. Mapa de navegação

### Tabs (barra inferior)

| Tab | Nome | Para que serve |
|---|---|---|
| 🏠 | **Hub** | Status do farm, XP, streak, challenge em destaque, medir |
| 📰 | **Feed** | Medições **públicas** de outras pessoas |
| ⚡ | **Medir** | Botão central elevado → abre **Captura** (não fica numa tela própria) |
| ⚔️ | **Challenges** | Desafios ativos + ranking |
| 👤 | **Perfil** | Dados, editar, sair, settings |

### Telas fora das tabs (stack)

| Tela | Entrada típica |
|---|---|
| Captura | Tab Medir · CTA do Hub · Duelo · Challenge |
| Preview | Depois de gravar / escolher da galeria |
| Processando | Depois do upload |
| Resultado | Quando a análise completa |
| Post | Toque num card do Feed |
| Challenge detalhe | Toque num challenge |
| Settings | Hub / Perfil |
| Editar perfil | Perfil → Editar |
| Setup username | Só se perfil incompleto |

---

## 4. Funcionalidades (visão do usuário)

### 4.1 Conta e perfil

- **Criar conta / entrar** com e-mail e senha  
- **Username único** (ex.: `AuraKing`) — usado no feed e ranking  
- **Nome de exibição** e **bio**  
- Toggle **perfil público** (edição)  
- **Sair** limpa a sessão local  

### 4.2 Hub (home)

Mostra:

- Total de aura, nº de medições, melhor tier  
- Nível, XP e streak  
- Orbe com a vibe do melhor tier  
- Um challenge em destaque (quando houver)  
- CTA principal: **Medir aura**  
- Atalho para Settings  

Estado vazio (ainda sem medições): copy do tipo “seu campo ainda não foi lido…”.

### 4.3 Medir aura (pipeline de vídeo)

Este é o fluxo principal de usabilidade:

```
⚡ Medir
   → 📷 Captura (câmera ou galeria)
   → 👀 Preview (público/privado · usar/descartar)
   → ☁️ Upload
   → ⏳ Processando (fila)
   → ✨ Resultado (tier + score)
```

#### Captura

- Countdown de **3s** antes de gravar  
- Virar câmera  
- Ou enviar da **galeria**  
- Limites: **até 1 minuto · até 50 MB**  
- Formatos: MP4 / MOV (H.264 preferencial)  

Se faltar permissão: tela pedindo acesso + atalho para ajustes + opção de galeria.

#### Preview

- Replay em loop  
- Escolher **Público** ou **Privado** (default vem das Settings)  
- **Descartar** → volta  
- **Usar este** → sobe o vídeo (barra de progresso %)  

#### Processando

Status que o usuário pode ver (via Realtime):

| Status | Sensação |
|---|---|
| `pending_upload` / `uploaded` | Enviando / confirmado |
| `queued` | Na fila |
| `processing` | Analisando |
| `completed` | Vai sozinho para o resultado |
| `failed` | Erro + tentar de novo / voltar |

#### Resultado

- Revelação do **tier** (Comum → Cósmica) + **score** animado  
- **Compartilhar** (share nativo do SO — texto)  
- **Medir de novo**  

> A “IA que lê o vídeo” no backend ainda é **stub** (simula métricas). O fluxo de upload, fila e tela de reveal já são reais.

### 4.4 Tiers de aura (o que o usuário entende)

| Tier | Sensação |
|---|---|
| Comum | Drop base |
| Rara | Já brilha |
| Épica | Respeito |
| Lendária | Flex |
| Divina | Quase mito |
| Cósmica | Jackpot |

A UI empurra a atenção para esse momento de raridade (orbe, glow, tipografia grande).

### 4.5 Feed social

- Lista de medições **públicas**  
- Cada card: nome, @, nível, tier, score  
- Abrir post → detalhe  
- **Duelar** (se não for o próprio post) → cria um challenge de duelo e manda para a Captura  

Empty: “Nada público ainda…”. Pull-to-refresh disponível.

**Privado:** a medição não entra no feed; quem tentar abrir post alheio privado vê bloqueio.

### 4.6 Challenges

Tipos (lore do produto):

| Tipo | Ideia |
|---|---|
| Weekly / Monthly / Seasonal | Temporada |
| Duel | 1v1 a partir do feed |
| Community | Meta coletiva |
| Tier hunt | Caçar raridade |
| Streak | Sequência de dias |

Usabilidade:

1. Ver lista de challenges **ativos**  
2. Abrir detalhe (texto, XP, regras)  
3. Ver **ranking** (#, @, tier, score)  
4. **Entrar** → join + Captura  

### 4.7 Settings

| Seção | Opções |
|---|---|
| Aparência | Escuro · Claro · Sistema (default: escuro) |
| Idioma | Português · English · Español |
| Privacidade | Visibilidade padrão das medições (privada/pública) |
| Notificações | Preferência de push de análises |
| Sobre | Versão do app |

### 4.8 Farm local (legado)

A rota antiga de “sortear aura sem vídeo” **não aparece mais na UI**.  
A tab Medir e `/measure` **redirecionam para a Captura**.  
Stats locais ainda podem espelhar resultados recentes se o perfil remoto falhar.

---

## 5. Permissões (quando o SO pede)

| Permissão | Momento |
|---|---|
| 📷 Câmera + 🎤 Microfone | Ao abrir Captura |
| 🖼️ Galeria | Ao tocar em “Galeria” |
| 🔔 Notificações | Após login (registro de token) |

Observações:

- Sem câmera, ainda dá para medir **pela galeria**  
- Push remoto **não funciona no Expo Go Android** (SDK 53+) — precisa de development build  
- Se negar “não perguntar de novo”, o app oferece abrir os **Ajustes** do sistema  

---

## 6. Estados de tela que o usuário encontra

| Situação | Feedback |
|---|---|
| App abrindo / perfil carregando | Spinner tela cheia |
| Formulários inválidos | Alert / mensagem |
| Username já usado | Alert “já está em uso” |
| Upload falhou | Alert + pode tentar de novo |
| Análise falhou | Tela processing com retry |
| Feed / challenges vazios | Empty state amigável |
| Sem permissão de câmera | CTA “Permitir acesso” + galeria |
| Resultado carregando | “Carregando resultado…” |

---

## 7. Idioma e tema na prática

- Idioma muda nas **Settings** e reflete nas tabs / hub / feed / challenges (i18n).  
- Algumas telas de auth/captura ainda têm textos fixos em português — experiência majoritariamente PT no fluxo de vídeo.  
- Tema **escuro** é o default da marca (“Farmar Aura”); claro e sistema existem para conforto.

---

## 8. O que é “produto real” vs “ainda simulado”

| Experiência | Status |
|---|---|
| Conta, login, sessão | ✅ Real (Supabase) |
| Username / perfil / feed / challenges / duelo | ✅ Real (DB + RLS) |
| Captura → upload R2 → fila → tela de wait/result | ✅ Real no app |
| Cálculo “inteligente” do tier pelo vídeo | 🟡 Stub no worker |
| Push “sua aura ficou pronta” | 🟡 Código pronto; Expo Go limitado |
| VIP / paywall / cotas | ❌ Ainda não na UI (ver modelo de negócio) |

---

## 9. Fluxos de uso típicos

### A) Medir e flexar

1. Abrir app → Hub  
2. Tocar ⚡ ou “Medir aura”  
3. Gravar 10–30s (ou galeria)  
4. Preview → Público → Usar  
5. Esperar processamento  
6. Reveal → Compartilhar  

### B) Duelar alguém do feed

1. Feed → abrir post  
2. **Duelar**  
3. Captura → upload  
4. Resultado entra no contexto do duelo / ranking  

### C) Farmar challenge da semana

1. Challenges → escolher ativo  
2. Ver ranking  
3. Entrar → medir  
4. Voltar ao ranking para ver posição  

### D) Manter privado

1. Settings → visibilidade padrão **Privada**  
   (ou escolher Privado no Preview)  
2. Medir normalmente  
3. Não aparece no feed  

---

## 10. Anatomia da UI (padrões de usabilidade)

| Padrão | Como aparece |
|---|---|
| CTA principal | Botão gradiente grande (radius ~18) |
| Identidade | Orbe com glow / partículas |
| Cards | Fundo escuro, borda sutil, glow roxo leve |
| Hierarquia | Título grande (Space Grotesk 700) + texto secundário `#B4B4C7` |
| Feedback | Microanimações no reveal; progress bars no upload/processing |
| Dark-first | Fundo `#09090B` — menos fadiga, mais “premium” |

O design empurra o olhar para **um job por tela**: medir, esperar, revelar, ou listar.

---

## 11. Mapa mental (usuário)

```
                    ┌─────────────┐
                    │   Splash    │
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
                    │ Onboarding  │──(pular)
                    └──────┬──────┘
                           ▼
                    ┌─────────────┐
              ┌─────│ Login/Reg   │
              │     └──────┬──────┘
              │            ▼
              │     ┌─────────────┐
              │     │  Username   │
              │     └──────┬──────┘
              │            ▼
              │     ┌──────────────────────────┐
              └──▶  │  HUB · FEED · ⚡ · CH · 👤 │
                    └────────────┬─────────────┘
                                 │ ⚡
                                 ▼
                    Captura → Preview → Fila → Reveal
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
                  Feed        Challenge     Share
```

---

## 12. Resumo de usabilidade

1. **Onboarding curto** ensina o jogo (scan / raridade / farm).  
2. **Username** é o “handle” social obrigatório.  
3. **Hub** é o status do personagem.  
4. **⚡ Medir** é o botão sagrado — tudo volta para o vídeo.  
5. **Público vs privado** decide se vira conteúdo social.  
6. **Feed + duelo + challenges** fecham o loop de retenção.  
7. **Settings** cuidam de tema, idioma e privacidade.  
8. A magia visual é a **revelação**; a mágica de backend (IA) ainda está em stub.

---

## 13. Relacionados

- [Modelo de negócio](./modelo-de-negocio.md) — VIP, cotas, custos  
- [README](../README.md) — setup técnico, Supabase, estrutura do repo  
