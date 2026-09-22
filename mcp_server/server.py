"""MCP tools for RecruitBot candidate retrieval and external context."""

import os
from typing import Any

import httpx
from dotenv import load_dotenv
from mcp.server.mcpserver import MCPServer

load_dotenv()

RECRUITBOT_API_URL = os.getenv("RECRUITBOT_API_URL", "http://localhost:3000").rstrip("/")
WEB_SEARCH_API_KEY = os.getenv("WEB_SEARCH_API_KEY")
WEB_SEARCH_API_URL = os.getenv("WEB_SEARCH_API_URL", "https://api.tavily.com/search")

server = MCPServer(
    name="recruitbot-mcp",
    version="1.0.0",
    description="RecruitBot candidate retrieval and external web-search tools.",
    instructions=(
        "Use search_candidates for resumes, skills, experience, education, and candidate matching. "
        "Use web_search only for external industry or technology context. Never use web results "
        "to invent candidate attributes."
    ),
)


@server.tool(
    name="search_candidates",
    description=(
        "Search the RecruitBot resume database for candidates matching a recruiter requirement. "
        "Use for candidates, resumes, skills, experience, education, and candidate comparisons."
    ),
)
async def search_candidates(
    query: str,
    top_k: int = 5,
    min_years_experience: float | None = None,
) -> dict[str, Any]:
    query = query.strip() if isinstance(query, str) else ""
    if not query:
        return {"success": False, "error": "INVALID_SEARCH_QUERY"}
    if not isinstance(top_k, int) or top_k < 1 or top_k > 20:
        return {"success": False, "error": "INVALID_TOP_K"}

    body: dict[str, Any] = {
        "query": query,
        "options": {"finalTopK": top_k, "rerankTopN": min(top_k * 2, 50)},
    }
    filters: dict[str, Any] = {}
    if min_years_experience is not None:
        if min_years_experience < 0:
            return {"success": False, "error": "INVALID_FILTER"}
        filters["minYearsExperience"] = min_years_experience
    if filters:
        body["filters"] = filters

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(f"{RECRUITBOT_API_URL}/v1/search", json=body)
        if response.status_code >= 400:
            return {"success": False, "error": "RECRUITBOT_API_UNAVAILABLE", "status": response.status_code}
        payload = response.json()
        results = payload.get("results", [])
        return {
            "success": True,
            "query": query,
            "results": results,
            "count": len(results),
            "degraded": payload.get("degraded", False),
            "warnings": payload.get("warnings", []),
        }
    except (httpx.HTTPError, ValueError):
        return {"success": False, "error": "RECRUITBOT_API_UNAVAILABLE"}


@server.tool(
    name="web_search",
    description=(
        "Search external web information for industry, technology, role, or other context "
        "not contained in the RecruitBot resume database."
    ),
)
async def web_search(query: str, max_results: int = 5) -> dict[str, Any]:
    query = query.strip() if isinstance(query, str) else ""
    if not query:
        return {"success": False, "error": "INVALID_SEARCH_QUERY"}
    if not WEB_SEARCH_API_KEY:
        return {"success": False, "error": "WEB_SEARCH_NOT_CONFIGURED"}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                WEB_SEARCH_API_URL,
                json={
                    "api_key": WEB_SEARCH_API_KEY,
                    "query": query,
                    "max_results": min(max(max_results, 1), 10),
                    "search_depth": "basic",
                    "include_answer": False,
                },
            )
        if response.status_code >= 400:
            return {"success": False, "error": "WEB_SEARCH_FAILED", "status": response.status_code}
        payload = response.json()
        results = [
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("content", "")[:400],
            }
            for item in payload.get("results", [])
            if item.get("title") and item.get("url")
        ]
        return {"success": True, "query": query, "results": results, "count": len(results)}
    except (httpx.HTTPError, ValueError):
        return {"success": False, "error": "WEB_SEARCH_FAILED"}


async def main() -> None:
    await server.run_stdio_async()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())