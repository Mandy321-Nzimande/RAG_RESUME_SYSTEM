# RecruitBot MCP Server

This server exposes two MCP tools without duplicating RecruitBot retrieval logic:

- `search_candidates` calls the TypeScript backend at `POST /v1/search`.
- `web_search` calls a configurable Tavily-compatible provider.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

Environment variables:

```env
RECRUITBOT_API_URL=http://localhost:3000
WEB_SEARCH_API_KEY=YOUR_KEY
WEB_SEARCH_API_URL=https://api.tavily.com/search
```

The server uses stdio transport for MCP clients.