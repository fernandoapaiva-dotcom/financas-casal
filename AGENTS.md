# FinançasCasal — contexto global

## Stack
- Backend: Node.js 22 + Express + Prisma ORM
- Banco dev: SQLite local (trocar para PostgreSQL OCI em produção)
- Frontend: React 18 + Vite + PWA (fase 3)
- Integração bancária: Pluggy SDK (fase 2)
- WhatsApp: Evolution API (fase 2)
- IA: Claude API (fase 2)

## Convenções
- Idioma do código: português (variáveis, funções, comentários)
- Chaves primárias: UUID (uuid v4)
- Datas: sempre UTC, tipo DateTime no Prisma
- Soft delete: campo deletadoEm (DateTime nullable) em todas as tabelas
- Respostas da API: sempre JSON com { dados, erro, mensagem }
- Autenticação: JWT no header Authorization: Bearer <token>
- Nunca commitar .env — usar .env.example com todas as chaves vazias

## Variáveis de ambiente (backend)
DATABASE_URL="file:./dev.db"
JWT_SECRET=
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
CLAUDE_API_KEY=
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
PORT=3000
