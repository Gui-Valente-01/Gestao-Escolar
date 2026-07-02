# 🎓 EduGestão IA

Plataforma de **gestão escolar inteligente** com agentes de inteligência artificial.
Cada perfil da comunidade escolar (administrador, diretor, pedagoga, professor, aluno e
responsável) tem sua própria área, com permissões, dashboards, CRUDs e um assistente de IA
que responde usando **dados reais do banco de dados**.

> Aplicação real e funcional — banco PostgreSQL, autenticação com sessão segura, permissões
> por papel, gráficos, server actions e integração com IA configurável. Nada de dados falsos
> no front-end.

---

## 🧱 Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | **Next.js 14** (App Router) + **TypeScript** |
| Estilo | **Tailwind CSS** (tema claro/escuro) |
| Banco | **PostgreSQL** + **Prisma ORM** |
| Autenticação | Sessão JWT (`jose`) em cookie httpOnly + **bcrypt** |
| Validação | **Zod** |
| Formulários | **React Hook Form** |
| Gráficos | **Recharts** |
| IA | Provider configurável compatível com OpenAI Chat Completions / Anthropic |
| Backend | **Server Actions** (CRUD) + **Route Handlers** (IA e auth) |

---

## ✅ Pré-requisitos

- **Node.js 18+** (recomendado 20/22)
- **Docker** + **Docker Compose** (para o PostgreSQL) — ou um PostgreSQL próprio

---

## 🚀 Como rodar (passo a passo)

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo de ambiente (copie o exemplo e ajuste se quiser)
cp .env.example .env

# 3. Subir o PostgreSQL com Docker
npm run db:up          # docker-compose up -d  (Postgres na porta 5432 + Adminer em :8080)

# 4. Criar as tabelas no banco (migration)
npm run db:migrate     # prisma migrate dev

# 5. Popular o banco com dados de teste reais
npm run db:seed

# 6. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**.

> Se preferir não usar migrations durante o desenvolvimento, use `npm run db:push`
> (sincroniza o schema direto) seguido de `npm run db:seed`.

---

## 🔑 Credenciais de demonstração

Após rodar o seed, use a senha **`edugestao123`** para qualquer conta abaixo:

| Perfil | E-mail |
|--------|--------|
| Administrador | `admin@edugestao.com` |
| Diretor | `diretor@edugestao.com` |
| Pedagoga | `pedagoga@edugestao.com` |
| Professor | `carlos.prof@edugestao.com` |
| Aluno | `ana.aluno@edugestao.com` |
| Responsável | `marta.resp@edugestao.com` |

### Criar o primeiro administrador (sem seed)

Se o banco estiver vazio, acesse **/register** para criar a conta de administrador
inicial. Esse cadastro só funciona enquanto **não existe nenhum usuário** (bootstrap seguro).

---

## 🤖 Configuração da IA

A IA é **opcional** e configurável por variáveis de ambiente. Sem chave, o sistema funciona em
**modo demonstração** (mostra o contexto real coletado do banco). Para ativar respostas reais:

```env
AI_PROVIDER="openai"                       # "openai" (compatível) ou "anthropic"
AI_API_KEY="sua-chave"
AI_BASE_URL="https://api.openai.com/v1"    # funciona com OpenRouter, Groq, Ollama, etc.
AI_MODEL="gpt-4o-mini"
AI_MAX_TOKENS="1200"
```

A chave **nunca** é exposta no front-end: as chamadas passam pelos endpoints
`/api/ai/[agent]` no servidor, que montam o contexto a partir do banco e persistem o histórico.

| Agente | Perfil | Rota |
|--------|--------|------|
| Agente Gestor | Diretor/Admin | `/api/ai/director` |
| Agente Pedagógico | Pedagoga | `/api/ai/pedagogue` |
| Agente Professor | Professor | `/api/ai/teacher` |
| Agente Tutor | Aluno | `/api/ai/student` |
| Agente Familiar | Responsável | `/api/ai/guardian` |

---

## 📜 Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gera o Prisma Client) |
| `npm start` | Sobe o build de produção |
| `npm run typecheck` | Verificação de tipos (TypeScript) |
| `npm run db:up` / `db:down` | Sobe/derruba o PostgreSQL via Docker |
| `npm run db:migrate` | Cria/aplica migrations |
| `npm run db:push` | Sincroniza o schema sem migration |
| `npm run db:seed` | Popula dados de teste |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:reset` | Reseta o banco e roda o seed |

---

## 🗂️ Estrutura do projeto

```txt
.
├── prisma/
│   ├── schema.prisma        # Modelo de dados completo
│   └── seed.ts              # Dados iniciais reais
├── src/
│   ├── app/
│   │   ├── api/             # Route handlers (auth + IA)
│   │   ├── dashboard/       # Áreas por perfil (admin, diretor, pedagoga, ...)
│   │   ├── login/ register/ # Autenticação
│   │   └── layout.tsx       # Layout raiz + tema
│   ├── components/
│   │   ├── ai/              # AiChatBox
│   │   ├── dashboard/       # DashboardCard, ChartCard
│   │   ├── forms/           # FormInput, SelectInput
│   │   ├── layout/          # Sidebar, Navbar, DashboardShell
│   │   ├── providers/       # ThemeProvider
│   │   └── ui/              # Button, Modal, Badge, DataTable, ...
│   ├── lib/                 # auth, jwt, prisma, permissions, ai, utils, audit
│   ├── services/            # Lógica de domínio (student, teacher, grade, ...)
│   ├── types/               # Tipos compartilhados
│   ├── validations/         # Schemas Zod
│   └── middleware.ts        # Proteção de rotas por role
├── docker-compose.yml       # PostgreSQL + Adminer
├── .env.example
└── package.json
```

---

## 🔐 Permissões por perfil

| Recurso | ADMIN | DIRETOR | PEDAGOGA | PROFESSOR | ALUNO | RESPONSÁVEL |
|---------|:-----:|:-------:|:--------:|:---------:|:-----:|:-----------:|
| Gerenciar usuários/turmas/disciplinas | ✅ | – | – | – | – | – |
| Relatórios gerais da escola | ✅ | ✅ | – | – | – | – |
| Acompanhamento pedagógico | ✅ | 👁️ | ✅ | – | – | – |
| Lançar notas/frequência | ✅ | – | – | ✅ (suas turmas) | – | – |
| Ver dados do próprio aluno | – | – | – | – | ✅ | – |
| Ver dados dos filhos | – | – | – | – | – | ✅ |

O acesso é garantido em **três camadas**: middleware (rota), `requireRole()` (página/ação)
e verificações de propriedade nos serviços (ex.: professor só lança nota das suas turmas;
responsável só vê dados dos filhos vinculados).

---

## 🛡️ Segurança & LGPD

- Senhas com **bcrypt** (custo 12).
- Sessão em **cookie httpOnly + JWT assinado** (`AUTH_SECRET`).
- Chave de IA **somente no servidor** (nunca no cliente).
- Validação no back-end com Zod em todas as Server Actions.
- **Logs de auditoria** (`AuditLog`) para ações importantes (login, CRUD, IA).
- Estrutura preparada para LGPD: dados de alunos protegidos por papel e propriedade.

---

## 🧩 Como estender (para os alunos)

1. Crie um modelo novo em `prisma/schema.prisma` e rode `npm run db:migrate`.
2. Adicione um serviço em `src/services/` para a lógica de leitura.
3. Crie as Server Actions em `src/app/dashboard/.../actions.ts` (valide com Zod).
4. Monte a página (server) + um *Manager* (client) reaproveitando
   `DataTable`, `Modal`, `FormInput` e `Button`.
5. Atualize `NAV_BY_ROLE` em `src/lib/permissions.ts` para exibir no menu.

---

Feito com 💙 usando Next.js, Prisma e IA.
