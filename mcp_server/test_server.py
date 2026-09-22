import unittest
from unittest.mock import AsyncMock, patch

from server import filter_candidates, search_candidates, web_search


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class McpToolTests(unittest.IsolatedAsyncioTestCase):
    async def test_empty_candidate_query(self):
        result = await search_candidates("")
        self.assertEqual(result, {"success": False, "error": "INVALID_SEARCH_QUERY"})

    async def test_no_candidates_is_successful_empty_result(self):
        response = FakeResponse(200, {"results": [], "degraded": False, "warnings": []})
        with patch("server.httpx.AsyncClient") as client_type:
            client = client_type.return_value
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=None)
            client.post = AsyncMock(return_value=response)
            result = await search_candidates("Python developer")
        self.assertTrue(result["success"])
        self.assertEqual(result["count"], 0)

    async def test_backend_failure_is_structured(self):
        response = FakeResponse(503)
        with patch("server.httpx.AsyncClient") as client_type:
            client = client_type.return_value
            client.__aenter__ = AsyncMock(return_value=client)
            client.__aexit__ = AsyncMock(return_value=None)
            client.post = AsyncMock(return_value=response)
            result = await search_candidates("Python developer")
        self.assertEqual(result["error"], "RECRUITBOT_API_UNAVAILABLE")

    async def test_web_search_without_key_is_structured(self):
        with patch("server.WEB_SEARCH_API_KEY", None):
            result = await web_search("machine learning roles")
        self.assertEqual(result["error"], "WEB_SEARCH_NOT_CONFIGURED")

    async def test_filter_requires_criteria(self):
        result = await filter_candidates({})
        self.assertEqual(result["error"], "INVALID_CRITERIA")


if __name__ == "__main__":
    unittest.main()