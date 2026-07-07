# 📘 Guia do Desenvolvedor — Antecipa Portal

**Antecipa Soluções Financeiras Ltda.**  
**CNPJ:** 12.670.349/0001-10  
**Última atualização:** Julho 2026

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#-visão-geral-da-arquitetura)
2. [Pré-requisitos](#-pré-requisitos)
3. [Setup Local (Primeira Vez)](#-setup-local-primeira-vez)
4. [Variáveis de Ambiente](#-variáveis-de-ambiente)
5. [Rodando Localmente](#-rodando-localmente)
6. [Deploy em Produção (Vercel)](#-deploy-em-produção-vercel)
7. [Como Funciona a Segurança](#-como-funciona-a-segurança)
8. [Integração com o App Nativo](#-integração-com-o-app-nativo)
9. [Estrutura de Pastas](#-estrutura-de-pastas)
10. [API Routes — Referência](#-api-routes--referência)
11. [Fluxo de Autenticação](#-fluxo-de-autenticação)
12. [Troubleshooting](#-troubleshooting)

---

## 🏗 Visão Geral da Arquitetura

O portal é uma **SPA (Single Page Application)** em React com um **backend serverless** na Vercel. A arquitetura foi desenhada para que **nenhuma credencial sensível** fique exposta no navegador.

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Hospedagem)                   │
│                                                         │
│  ┌──────────────┐          ┌──────────────────────┐     │
│  │   Frontend   │  ──────► │   API Routes (api/)  │     │
│  │  React/Vite  │  fetch   │  Serverless Functions │     │
│  │   (público)  │ /api/*   │   (protegido)        │     │
│  └──────────────┘          └──────┬───────────────┘     │
│                                   │                     │
└───────────────────────────────────┼─────────────────────┘
                                    │ Credenciais seguras
                          ┌─────────┴─────────┐
                          │                   │
                    ┌─────▼─────┐     ┌──────▼──────┐
                    │  Bitrix24 │     │Google Sheets │
                    │   (CRM)   │     │ (Planilhas)  │
                    └───────────┘     └─────────────┘
```

**Stack:**
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS
- **Backend:** Vercel Serverless Functions (Node.js)
- **Auth:** Firebase Authentication (Google Sign-In)
- **Database:** Cloud Firestore
- **CRM:** Bitrix24 (via Webhooks)
- **Dados:** Google Sheets (via Google Visualization API)

---

## ⚙ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

| Ferramenta | Versão Mínima | Instalação |
|---|---|---|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Vem com o Node.js |
| **Git** | 2.x | [git-scm.com](https://git-scm.com) |
| **Vercel CLI** | 34+ | `npm i -g vercel` |
| **VS Code** (recomendado) | Qualquer | [code.visualstudio.com](https://code.visualstudio.com) |

### Extensões VS Code Recomendadas
- ESLint
- Tailwind CSS IntelliSense
- TypeScript Importer

---

## 🚀 Setup Local (Primeira Vez)

### 1. Clone o repositório

```bash
git clone https://github.com/RaphaelDamasceno/antecipa-hubon.git
cd antecipa-hubon
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite o `.env.local` e preencha os valores. Veja a seção [Variáveis de Ambiente](#-variáveis-de-ambiente) para detalhes de cada uma.

### 4. Conecte à Vercel (para ter acesso às env vars do servidor)

```bash
vercel login
vercel link
vercel env pull    # Baixa as env vars do servidor para .env.local
```

### 5. Rode o projeto

```bash
vercel dev    # Inicia frontend + API routes
```

O portal estará acessível em `http://localhost:3000`.

> **⚠️ Importante:** Use `vercel dev` em vez de `npm run dev`. O `vercel dev` roda o Vite E as API routes juntos. O `npm run dev` roda apenas o frontend e as chamadas à `/api/*` vão falhar.

---

## 🔐 Variáveis de Ambiente

As variáveis são separadas em **duas categorias**:

### Client-side (prefixo `VITE_`)

Essas são injetadas no JavaScript do navegador. **Apenas** configurações do Firebase devem usar esse prefixo — o Firebase SDK foi projetado para rodar no client de forma segura (a proteção real vem das Firestore Rules).

| Variável | Descrição |
|---|---|
| `VITE_FIREBASE_API_KEY` | API Key do projeto Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `VITE_FIREBASE_FIRESTORE_DATABASE_ID` | ID do database Firestore (ou `(default)`) |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket do Firebase Storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ID do sender FCM |
| `VITE_FIREBASE_APP_ID` | App ID do Firebase |

### Server-side (sem prefixo `VITE_`)

Essas **NUNCA** aparecem no navegador. Ficam exclusivamente no servidor da Vercel.

| Variável | Descrição | Exemplo |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Mesmo valor do `VITE_FIREBASE_PROJECT_ID` | `gen-lang-client-...` |
| `ACCESS_TOKEN` | Token secreto do portão de acesso | `antecipa2026_hubon_key` |
| `BITRIX_WEBHOOK_WRITE_URL` | Webhook Bitrix para criar/atualizar deals | `https://xxx.bitrix24.com.br/rest/.../crm.deal.add.json` |
| `BITRIX_LIST_URL` | Webhook Bitrix para listar deals | `https://xxx.bitrix24.com.br/rest/.../crm.deal.list.json` |
| `SHEET_ID` | ID da planilha Google | String longa da URL da planilha |
| `SHEET_TAB_USUARIOS` | Nome da aba de usuários | `usuários` |
| `SHEET_TAB_CR` | Nome da aba de comissões | `CR 2025` |

### ❌ NUNCA faça isso:
```bash
# ERRADO — expõe credenciais no navegador!
VITE_BITRIX_WEBHOOK_URL="https://..."
VITE_SHEET_ID="abc123"
```

### ✅ Correto:
```bash
# Certo — fica apenas no servidor
BITRIX_WEBHOOK_WRITE_URL="https://..."
SHEET_ID="abc123"
```

---

## 💻 Rodando Localmente

### Desenvolvimento (frontend + backend)

```bash
vercel dev
```

Isso inicia:
- Frontend Vite em `http://localhost:3000`
- API Routes em `http://localhost:3000/api/*`

### Apenas o frontend (sem API routes)

```bash
npm run dev
```

> ⚠️ As chamadas à `/api/*` **não funcionarão** nesse modo.

### Type checking

```bash
npm run lint
```

### Build de produção (local)

```bash
npm run build
```

Gera os arquivos otimizados na pasta `dist/`.

---

## 🌐 Deploy em Produção (Vercel)

### Deploy automático (recomendado)

Todo push na branch `main` dispara um deploy automático na Vercel.

```bash
git add -A
git commit -m "feat: minha alteração"
git push origin main
# Deploy automático em ~60 segundos
```

### Deploy manual via CLI

```bash
vercel --prod
```

### Adicionar/alterar variáveis de ambiente

```bash
# Adicionar uma nova variável
echo "novo_valor" | vercel env add NOME_VARIAVEL production

# Listar variáveis existentes
vercel env ls

# Remover uma variável
vercel env rm NOME_VARIAVEL production
```

> **Após alterar env vars**, é necessário fazer um novo deploy para que as mudanças tenham efeito.

### Rollback

Se algo der errado, acesse o [Dashboard da Vercel](https://vercel.com) → Deployments → clique nos três pontos do deploy anterior → **Promote to Production**.

---

## 🔒 Como Funciona a Segurança

### Portão de Acesso (Embed-Only)

O portal só pode ser acessado a partir do app nativo. O fluxo:

```
App Nativo → abre WebView com ?token=ACCESS_TOKEN
           → Frontend envia token para /api/access/validate
           → Servidor compara com ACCESS_TOKEN (env var)
           → Retorna { allowed: true/false }
           → Frontend mostra portal ou tela de bloqueio
```

O token **nunca aparece no JavaScript** do site. Ele é validado exclusivamente no servidor.

### Autenticação do Usuário

Duas camadas de autenticação:

1. **Firebase Auth (Google):** Primeiro, o usuário faz login com Google. Isso gera um **ID Token** criptografado.

2. **Validação na Planilha:** O ID Token é enviado ao backend, que verifica se o usuário (nome + CPF + data nascimento) existe na planilha Google.

### Proteção das APIs

Toda chamada às rotas `/api/*` (exceto `/api/access/validate`) exige um **Firebase ID Token** válido no header `Authorization`:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

O middleware `api/lib/auth.ts` verifica esse token usando o Firebase Admin SDK antes de processar qualquer requisição.

---

## 📱 Integração com o App Nativo

### URL de acesso

```
https://antecipa-hubon.vercel.app/?token=SEU_TOKEN_AQUI
```

### Exemplos de implementação

#### Android (Kotlin)
```kotlin
val url = "https://antecipa-hubon.vercel.app/?token=SEU_TOKEN"
val webView = WebView(context)
webView.settings.javaScriptEnabled = true
webView.loadUrl(url)
```

#### iOS (Swift)
```swift
let url = URL(string: "https://antecipa-hubon.vercel.app/?token=SEU_TOKEN")!
let webView = WKWebView(frame: view.bounds)
webView.load(URLRequest(url: url))
```

#### React Native
```jsx
import { WebView } from 'react-native-webview';

<WebView
  source={{ uri: 'https://antecipa-hubon.vercel.app/?token=SEU_TOKEN' }}
  javaScriptEnabled={true}
/>
```

#### Flutter
```dart
WebView(
  initialUrl: 'https://antecipa-hubon.vercel.app/?token=SEU_TOKEN',
  javascriptMode: JavascriptMode.unrestricted,
)
```

### Tokens de acesso aceitos

O token é definido na variável de ambiente `ACCESS_TOKEN` do servidor. Além do token, o sistema também aceita acesso via **HTTP Referrer** de domínios autorizados:

- `bitrix`
- `crm`
- `antecipabroker`
- `meuapp`
- `app-empresa`

---

## 📁 Estrutura de Pastas

```
antecipa-hubon/
├── api/                          # ⚡ Backend (Vercel Serverless Functions)
│   ├── lib/
│   │   ├── auth.ts               #   Middleware de autenticação
│   │   ├── firebaseAdmin.ts      #   Firebase Admin SDK
│   │   └── utils.ts              #   Funções de normalização
│   ├── access/
│   │   └── validate.ts           #   POST /api/access/validate
│   ├── bitrix/
│   │   ├── create.ts             #   POST /api/bitrix/create
│   │   ├── deals.ts              #   POST /api/bitrix/deals
│   │   └── update.ts             #   POST /api/bitrix/update
│   └── sheets/
│       ├── authenticate.ts       #   POST /api/sheets/authenticate
│       └── receivables.ts        #   POST /api/sheets/receivables
│
├── src/                          # 🎨 Frontend (React + TypeScript)
│   ├── components/
│   │   ├── Dashboard.tsx         #   Painel principal do corretor
│   │   ├── LoginForm.tsx         #   Formulário de login (nome+CPF+nasc.)
│   │   ├── ProposalModal.tsx     #   Modal de proposta + assinatura
│   │   ├── CollateralModal.tsx   #   Modal de títulos em garantia
│   │   ├── SuccessModal.tsx      #   Modal de confirmação
│   │   ├── NotificationCenter.tsx#   Central de notificações
│   │   ├── InstitutionalPage.tsx #   Página institucional
│   │   └── Footer.tsx            #   Rodapé
│   ├── services/
│   │   ├── apiClient.ts          #   Helper para chamadas autenticadas
│   │   ├── bitrixService.ts      #   Lógica Bitrix (mapeamentos + proxy)
│   │   ├── firebaseService.ts    #   Firebase Auth + Firestore
│   │   └── sheetsService.ts      #   Interfaces + proxy para planilha
│   ├── lib/
│   │   └── utils.ts              #   Utilitários (cn, normalizações)
│   ├── App.tsx                   #   Componente raiz + portão de acesso
│   ├── main.tsx                  #   Entry point
│   └── index.css                 #   Estilos globais
│
├── firestore.rules               # 🔐 Regras de segurança do Firestore
├── vercel.json                   # ⚙️  Configuração da Vercel
├── .env.example                  # 📋 Template de variáveis de ambiente
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 📡 API Routes — Referência

Todas as rotas usam `POST` e retornam JSON.

### `POST /api/access/validate`
**Auth:** Nenhuma  
**Body:** `{ token?: string, referrer?: string }`  
**Response:** `{ allowed: boolean }`  
**Descrição:** Valida se o acesso ao portal é permitido.

---

### `POST /api/sheets/authenticate`
**Auth:** Firebase ID Token  
**Body:** `{ nome: string, dataNascimento: string, cpf: string }`  
**Response:** `UserData` ou `401`  
**Descrição:** Autentica o usuário comparando com a planilha de cadastro.

---

### `POST /api/sheets/receivables`
**Auth:** Firebase ID Token  
**Body:** `{ user: UserData }`  
**Response:** `Receivable[]`  
**Descrição:** Retorna os recebíveis/comissões do usuário, filtrados por papel.

---

### `POST /api/bitrix/deals`
**Auth:** Firebase ID Token  
**Body:** `{ pvIds: string[] }`  
**Response:** `Deal[]`  
**Descrição:** Lista deals existentes no Bitrix para os PVs informados.

---

### `POST /api/bitrix/create`
**Auth:** Firebase ID Token  
**Body:** `{ mode: 'single', payload: {...} }` ou `{ mode: 'multiple', payloads: [...] }`  
**Response:** Resultado do Bitrix  
**Descrição:** Cria um ou mais deals no Bitrix.

---

### `POST /api/bitrix/update`
**Auth:** Firebase ID Token  
**Body:** `{ dealId: string, action: 'attachFile' | 'reject', base64File?: string, fileName?: string }`  
**Response:** Resultado do Bitrix  
**Descrição:** Atualiza um deal — anexa arquivo ou rejeita.

---

## 🔄 Fluxo de Autenticação

```
Usuário abre o portal via app (?token=xxx)
        │
        ▼
┌─ /api/access/validate ─────────────────┐
│  Token válido? → Portal liberado       │
│  Token inválido? → Tela de bloqueio    │
└────────────────────────────────────────┘
        │ (liberado)
        ▼
┌─ Firebase Auth ────────────────────────┐
│  Login com Google (popup)              │
│  → Gera ID Token                      │
└────────────────────────────────────────┘
        │
        ▼
┌─ /api/sheets/authenticate ─────────────┐
│  Envia: nome + CPF + data nascimento   │
│  Servidor: busca na planilha           │
│  → Retorna dados do usuário            │
└────────────────────────────────────────┘
        │
        ▼
┌─ Dashboard ────────────────────────────┐
│  /api/sheets/receivables → comissões   │
│  /api/bitrix/deals → status no CRM    │
│  Firestore → dados locais             │
└────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### "Acesso Bloqueado" ao abrir o site

**Causa:** Sem token na URL ou token inválido.  
**Solução:** Acesse com `?token=SEU_TOKEN` ou verifique se a env var `ACCESS_TOKEN` está configurada na Vercel.

### Erro 401 nas chamadas de API

**Causa:** Firebase ID Token ausente ou expirado.  
**Solução:** O usuário precisa estar logado com Google. Tokens expiram após 1 hora e são renovados automaticamente pelo Firebase SDK.

### "Erro na autenticação" no login

**Causa:** Nome, CPF ou data de nascimento não encontrados na planilha.  
**Solução:** Verificar se o usuário está cadastrado na aba "usuários" da planilha Google. Os dados precisam ser exatos (a normalização remove espaços extras e formatação de CPF).

### API routes retornando 500

**Causa:** Variáveis de ambiente não configuradas.  
**Solução:** Rode `vercel env ls` e confirme que todas as variáveis server-side estão presentes. Após adicionar/alterar, faça um novo deploy.

### Build falhando

**Causa:** Erro de TypeScript ou dependências.  
**Solução:**
```bash
npm run lint     # Verifica erros de tipo
npm install      # Reinstala dependências
npm run build    # Tenta buildar
```

### Alterações não aparecem em produção

**Causa:** Cache da Vercel ou falta de deploy.  
**Solução:**
```bash
git push origin main    # Trigger deploy automático
# ou
vercel --prod           # Deploy manual
```

---

## 🏷️ Branches

| Branch | Propósito |
|---|---|
| `main` | Código de produção — deploy automático |
| `google-ai-studio` | Backup do código original (antes do refactor de segurança) |

---

> **⚠️ Aviso de Confidencialidade:** Este documento contém informações de arquitetura interna. Não compartilhe fora do time de desenvolvimento.
