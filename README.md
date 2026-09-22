# Resume RAG System

Resume ingestion and retrieval service with a React frontend. The backend parses uploaded resumes, generates embeddings, and supports BM25, vector, hybrid, and LLM-assisted candidate search.

## Project structure

- `src/` - Express and TypeScript backend
- `recruitbot-web/` - React and Vite frontend
- `postman/` - Postman collections for the implementation phases
- `01_Resume_Ingestion_Phasewise_Implementation 1 1.md` - ingestion plan
- `02_Resume_Retrieval_Phasewise_Implementation 1.md` - retrieval plan

## Requirements

- Node.js 18 or newer
- MongoDB with Atlas Search configured for the retrieval indexes
- Mistral API key for embeddings
- Groq API key only when LLM parsing or LLM retrieval features are enabled

## Backend setup

```bash
npm install
copy .env.example .env
```

Update `.env` with your MongoDB connection string and API keys, then run:

```bash
npm run dev
```

The backend listens on `http://localhost:3000` by default.

Useful commands:

```bash
npm test
npm run build
```

## Frontend setup

```bash
cd recruitbot-web
npm install
copy .env.development .env.local
npm run dev
```

The Vite development server prints the local frontend URL. Set `VITE_API_BASE_URL` in `.env.local` when the backend is hosted elsewhere.

## Configuration

Use `.env.example` as the backend configuration template. Do not commit `.env`, `.env.local`, production secrets, API keys, database credentials, or uploaded resumes.

## API and verification

The Postman collections in `postman/` cover the ingestion and retrieval phases. The retrieval module also contains focused service tests under `src/modules/retrieval/`.

## Agent and MCP

The agent endpoint is `POST /v1/agent/chat` with a body such as:

```json
{
	"message": "Find a Python developer with machine learning experience",
	"topK": 5
}
```

It reuses the existing retrieval pipeline and returns an answer, candidate results, tools used, warnings, and optional external sources. Configure `WEB_SEARCH_API_KEY` to enable the Tavily-compatible fallback.

Hard-constraint queries run through exact candidate filtering first. If exact filtering returns no candidates, the agent stops without running unfiltered semantic search. Set `MIN_SIMILARITY` in `.env` to tune the default vector relevance cutoff of `0.55`.

The standalone Python MCP server is in `mcp_server/`. It exposes `search_candidates` and `web_search` over stdio and delegates candidate retrieval to the TypeScript API. See [mcp_server/README.md](mcp_server/README.md) for setup.