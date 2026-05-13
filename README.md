<p align="center">
  <a href="https://fuse.ai" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/logo/wordmark.svg">
      <source media="(prefers-color-scheme: light)" srcset="apps/web/public/logo/wordmark-dark.svg">
      <img src="apps/web/public/logo/wordmark-dark.svg" alt="Fuse Logo" width="380"/>
    </picture>
  </a>
</p>

<p align="center">The production-grade platform to build AI agents and run your automated workforce. Connect 1,000+ integrations and LLMs to orchestrate secure, scalable agentic workflows.</p>

<p align="center">
  <a href="https://fuse.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/fuse.ai-4d7fff" alt="Fuse.ai"></a>
  <a href="https://discord.gg/fuse" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
  <a href="https://x.com/fusedotai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/twitter/follow/fusedotai?style=social" alt="Twitter"></a>
  <a href="https://docs.fuse.ai" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Docs-4d7fff.svg" alt="Documentation"></a>
</p>

<p align="center">
  <a href="https://cursor.com/link/prompt?text=Help%20me%20set%20up%20Fuse%20locally."><img src="https://img.shields.io/badge/Set%20Up%20with-Cursor-000000?logo=cursor&logoColor=white" alt="Set Up with Cursor"></a>
</p>

### Build Workflows with Ease
Design agent workflows visually on a canvas—connect agents, browser automation, and logic blocks, then run them instantly with enterprise-grade security.

<p align="center">
  <img src="apps/web/public/static/workflow.gif" alt="Workflow Builder Demo" width="800"/>
</p>

### Supercharge with AI Agents
Leverage built-in AI agents to perform complex reasoning, interact with tools, and iterate on processes directly from natural language.

<p align="center">
  <img src="apps/web/public/static/agents.gif" alt="Agents Demo" width="800"/>
</p>

### Secure Credential Management
Never expose your secrets. Fuse uses AES-256 encrypted storage and an isolated vault to manage OAuth tokens and API keys across your entire workforce.

<p align="center">
  <img src="apps/web/public/static/credentials.gif" alt="Credentials Demo" width="800"/>
</p>

## Quickstart

### Cloud-hosted: [fuse.ai](https://fuse.ai)

### Self-hosted: NPM Package

```bash
npx fuse-studio
```
→ http://localhost:8080

#### Note
Docker must be installed and running on your machine.

### Self-hosted: Docker Compose

```bash
git clone https://github.com/fusedotai/fuse.git && cd fuse
docker compose up -d
```

Open [http://localhost:8080](http://localhost:8080)

### Self-hosted: Manual Setup

**Requirements:** [pnpm](https://pnpm.io/), [Node.js](https://nodejs.org/) v20+, [uv](https://astral.sh/uv), PostgreSQL 15+, Redis 7+

1. Clone and install:

```bash
git clone https://github.com/fusedotai/fuse.git
cd fuse
pnpm install
make setup
```

2. Configure environment:

```bash
cp .env.example .env
# Create your secrets
openssl rand -hex 32 # Set this as ENCRYPTION_KEY in .env
```

3. Run migrations:

```bash
cd apps/api && uv run alembic upgrade head
```

4. Start development servers:

```bash
make dev
```

## Tech Stack

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Backend), [React](https://reactjs.org/) (Frontend)
- **Dependency Management**: [uv](https://astral.sh/uv) (Python), [pnpm](https://pnpm.io/) (Node)
- **Database**: PostgreSQL with [SQLAlchemy](https://www.sqlalchemy.org/)
- **Cache & Broker**: [Redis](https://redis.io/)
- **Background Jobs**: [Celery](https://docs.celeryq.dev/)
- **Browser Automation**: [Playwright](https://playwright.dev/)
- **UI**: [Tailwind CSS](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/), [TanStack Query](https://tanstack.com/query)
- **Flow Editor**: [ReactFlow](https://reactflow.dev/)
- **Monorepo**: [Turborepo](https://turborepo.org/)
- **Realtime**: [WebSockets](https://fastapi.tiangolo.com/advanced/websockets/)

## Contributing

We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for details.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

<p align="center">Made with ❤️ by the Fuse Team</p>
