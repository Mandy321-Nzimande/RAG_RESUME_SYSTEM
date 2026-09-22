# RecruitBot — MCP-Powered Agentic RAG Implementation

## 1. Objective

Enhance the existing **RecruitBot Resume RAG system** by adding an **MCP-powered agentic retrieval layer**.

Do NOT rebuild the existing RAG system.

The existing RecruitBot already supports:

* Resume PDF ingestion
* Resume text extraction
* Structured resume parsing
* Resume embeddings using Mistral
* MongoDB Atlas Vector Search
* BM25 keyword search
* Hybrid retrieval
* Candidate deduplication
* LLM reranking
* Candidate summaries
* Retrieval validation
* Existing frontend for candidate search

The goal is to expose the existing retrieval functionality through an MCP tool and allow an AI agent to decide when to use candidate retrieval and when additional retrieval is needed.

---

# 2. Current Architecture

The existing backend is TypeScript.

Important existing structure:

```text
src/
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── ...
├── modules/
│   ├── ingestion/
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   └── retrieval/
│       ├── README.md
│       ├── controllers/
│       │   └── retrievalController.ts
│       ├── repositories/
│       │   └── ResumeRepository.ts
│       ├── routes/
│       │   └── retrievalRoutes.ts
│       ├── services/
│       │   ├── LLMService.ts
│       │   ├── RetrievalValidationService.ts
│       │   └── SearchService.ts
│       ├── types/
│       │   └── retrieval.types.ts
│       └── utils/
│           ├── candidateMapper.ts
│           └── deduplicate.ts
```

The existing retrieval flow is approximately:

```text
Recruiter Query
      ↓
SearchService
      ↓
 ┌───────────────┐
 │               │
BM25          Vector
 │               │
 └───────┬───────┘
         ↓
    Merge/Deduplicate
         ↓
       Rerank
         ↓
   Candidate Results
         ↓
      Frontend
```

---

# 3. Existing SearchService

Do NOT duplicate this functionality.

The existing:

```text
src/modules/retrieval/services/SearchService.ts
```

already contains:

```text
bm25Search()
vectorSearch()
hybridSearch()
endToEndSearch()
```

The existing `endToEndSearch()` performs approximately:

```text
Query
 ↓
BM25 Search
 ↓
Vector Search
 ↓
Merge
 ↓
Deduplicate
 ↓
LLM Reranking
 ↓
Optional Candidate Summaries
 ↓
Final Results
```

Reuse this existing functionality.

Do NOT create another MongoDB vector-search implementation.

Do NOT create another embedding implementation.

Do NOT duplicate BM25.

Do NOT duplicate reranking.

---

# 4. Target Architecture

Implement the following architecture:

```text
                    Recruiter
                       │
                       ▼
                 RecruitBot UI
                       │
                       ▼
                Agent API / Chat
                       │
                       ▼
                  AI Agent
                       │
              ┌────────┴─────────┐
              │                  │
              ▼                  ▼
       MCP Candidate Tool    MCP Web Search Tool
              │                  │
              ▼                  ▼
       RecruitBot API       External Web Search
              │
              ▼
        SearchService
              │
       ┌──────┴──────┐
       ▼             ▼
     BM25          Vector
       │             │
       └──────┬──────┘
              ▼
          Reranking
              │
              ▼
        Candidate Results
              │
              └──────────────┐
                             ▼
                         AI Agent
                             │
                             ▼
                          Answer
```

The important idea is:

```text
User
 ↓
Agent
 ↓
MCP Tool
 ↓
Existing RecruitBot RAG
 ↓
Results
 ↓
Agent evaluates results
 ↓
Answer
```

---

# 5. MCP Responsibilities

MCP should provide a standardized interface for the AI agent to use RecruitBot functionality.

MCP does NOT replace:

* MongoDB
* REST APIs
* SearchService
* BM25
* Vector Search
* Reranking

MCP is the tool interface between the agent and those existing capabilities.

---

# 6. MCP Server

The MCP server will be implemented separately from the TypeScript RecruitBot backend.

The current MCP environment uses:

```text
Python
MCP version 2.2.0
```

The existing MCP installation uses:

```python
from mcp.server.mcpserver import MCPServer
```

Do NOT use:

```python
from mcp.server.fastmcp import FastMCP
```

because the installed MCP version is 2.2.0.

The MCP server should be responsible for exposing tools to the AI agent.

---

# 7. MCP-to-RecruitBot Communication

The existing RecruitBot backend is TypeScript.

The MCP server is Python.

Do NOT duplicate RecruitBot database logic inside Python.

Use:

```text
Python MCP Server
       ↓
HTTP Request
       ↓
RecruitBot TypeScript API
       ↓
SearchController
       ↓
SearchService
       ↓
MongoDB
```

This keeps the existing RAG implementation as the single source of truth.

---

# 8. MCP Tool 1 — Candidate Search

Create an MCP tool that exposes RecruitBot candidate search.

Suggested tool:

```text
search_candidates
```

Purpose:

```text
Search the RecruitBot resume database for candidates matching a recruiter query.
```

Input:

```json
{
  "query": "Python developer with machine learning experience",
  "top_k": 5
}
```

Optional filters should be supported if the existing API already supports them.

Possible filters:

```json
{
  "location": "Johannesburg",
  "skills": ["Python", "SQL"],
  "experience": 3
}
```

Do not add filters that are not supported by the existing backend unless necessary.

---

# 9. Candidate Search Tool Flow

The MCP tool should perform:

```text
search_candidates()
        ↓
HTTP request to RecruitBot backend
        ↓
existing retrieval endpoint
        ↓
SearchService.endToEndSearch()
        ↓
BM25 + Vector Search
        ↓
Deduplication
        ↓
LLM Reranking
        ↓
Candidate results
        ↓
MCP tool returns structured JSON
```

Example response:

```json
{
  "query": "Python developer with machine learning experience",
  "results": [
    {
      "candidate_id": "123",
      "name": "Candidate Name",
      "skills": [
        "Python",
        "Machine Learning",
        "SQL"
      ],
      "experience": "3 years",
      "score": 0.91
    }
  ],
  "count": 1,
  "degraded": false,
  "warnings": []
}
```

Use the actual candidate fields already returned by RecruitBot.

Do not invent candidate fields if they do not exist.

---

# 10. MCP Tool 2 — Web Search / Fallback Search

Add a second MCP tool for fallback retrieval.

Suggested name:

```text
web_search
```

Purpose:

```text
Search external web information when RecruitBot candidate retrieval does not provide sufficient information.
```

The implementation should use an available web-search API/provider.

Keep the provider configurable through environment variables.

Do not hard-code API keys.

Example input:

```json
{
  "query": "Python machine learning skills commonly required for backend developer roles",
  "max_results": 5
}
```

Example output:

```json
{
  "query": "...",
  "results": [
    {
      "title": "...",
      "url": "...",
      "snippet": "..."
    }
  ]
}
```

If no web-search provider is configured, return a clear structured error instead of crashing.

---

# 11. Agentic Retrieval Logic

The agent should decide which tool to use.

Basic flow:

```text
Recruiter Query
      ↓
     Agent
      ↓
search_candidates
      ↓
Evaluate candidate results
      ↓
Are results sufficient?
     / \
   YES  NO
    │    │
    │    ▼
    │ web_search
    │    │
    └────┴───────┐
                 ▼
          Combine Evidence
                 ↓
               Answer
```

The agent should NOT automatically call web search for every query.

Use RecruitBot candidate search first when the query is about candidates/resumes.

Use web search only when additional external information is required.

---

# 12. Agent Instructions

The agent should follow these rules:

```text
You are RecruitBot, an AI recruitment assistant.

Your primary source for candidate searches is the RecruitBot candidate search tool.

When the recruiter asks for candidates:

1. Understand the recruitment requirement.
2. Use search_candidates.
3. Inspect the returned candidate results.
4. Determine whether the returned information is sufficient to answer the recruiter.
5. If the candidate results are sufficient, answer using those results.
6. If additional external information is needed, use web_search.
7. Clearly distinguish candidate information from external web information.
8. Never invent candidate information.
9. Never claim a candidate has a skill unless the retrieved resume/profile supports it.
10. Do not expose internal implementation details unless requested.
11. Return concise and useful recruitment results.
12. If no suitable candidate is found, clearly say that no matching candidate was retrieved.
```

---

# 13. Retrieval Quality

Do not rely only on whether results exist.

The agent should consider:

```text
Number of results
Relevance
Similarity/ranking information
Whether the results contain the requested skills
Whether the results contain enough information to answer
Warnings/degraded status
```

Example:

```text
Query:
"Find Python developers with 5 years of machine learning experience"

Retrieved:
Candidate A:
Python ✓
Machine Learning ✓
Experience: 1 year

Candidate B:
Java ✓
Experience: 6 years
Machine Learning ✗
```

The agent should recognize that the retrieved results do not fully satisfy the request.

Do not fabricate a match.

---

# 14. Existing Retrieval Validation

Inspect and reuse:

```text
src/modules/retrieval/services/RetrievalValidationService.ts
```

If this service already determines retrieval quality, use it rather than creating duplicate validation logic.

If the existing service provides useful validation information, expose that information to the agent.

---

# 15. Backend API

Inspect:

```text
src/modules/retrieval/routes/retrievalRoutes.ts
src/modules/retrieval/controllers/retrievalController.ts
```

before implementing anything.

Determine the existing retrieval endpoint.

Prefer using the existing endpoint if it already exposes:

```text
query
filters
topK
search options
```

Do not create another endpoint if an appropriate existing endpoint can be reused.

If an additional endpoint is genuinely required, keep it minimal.

Suggested endpoint:

```text
POST /api/retrieval/search
```

Example:

```json
{
  "query": "Python machine learning developer",
  "topK": 5
}
```

Response should use the existing SearchService result structure where possible.

---

# 16. Backend MCP Integration Endpoint

If the existing retrieval API cannot safely be used by the MCP server, create a small internal API endpoint specifically for MCP.

Suggested:

```text
POST /api/mcp/search-candidates
```

Input:

```json
{
  "query": "Python developer",
  "topK": 5
}
```

The endpoint should call:

```text
SearchService.endToEndSearch()
```

It must NOT contain its own search implementation.

---

# 17. Frontend Changes

The existing RecruitBot frontend should be updated to support the agentic experience.

Do not rebuild the frontend.

Inspect the existing:

```text
src/App.tsx
```

and existing components/hooks/API clients.

Add the smallest necessary changes.

---

# 18. Frontend User Experience

The recruiter should be able to type a natural-language request such as:

```text
Find me a Python developer with machine learning experience.
```

The UI sends the request to the agent.

The frontend should display:

```text
Recruiter Query
        ↓
Agent Processing
        ↓
Tools Used
        ↓
Candidate Results
        ↓
Final Answer
```

---

# 19. Agent Chat UI

If the existing frontend already has a search interface, extend it instead of creating a completely separate application.

The interface should contain:

```text
RecruitBot
────────────────────────────

What type of candidate are you looking for?

[ Python developer with ML experience     ]

[ Search ]

────────────────────────────

Agent Status:
Searching candidate database...

────────────────────────────

Candidates

Candidate 1
Name: ...
Skills: ...
Experience: ...
Match information: ...

Candidate 2
Name: ...
Skills: ...
Experience: ...

────────────────────────────

Sources / Tools Used:
✓ RecruitBot Candidate Search
○ Web Search

────────────────────────────

AI Summary:
...
```

The exact UI should match the existing application's design.

---

# 20. Tool Status

Show useful tool activity without exposing internal technical details.

Examples:

```text
Searching candidate database...
```

Then:

```text
Candidate database searched
```

If fallback search is needed:

```text
Looking for additional information...
```

Then:

```text
Additional information retrieved
```

Avoid displaying raw MCP protocol messages.

---

# 21. Frontend API Layer

Inspect existing API clients.

If there is already a retrieval API client, extend it.

Do not create duplicate API utilities.

Suggested function:

```ts
searchRecruitBotAgent(query: string)
```

or adapt the existing search function.

The frontend should call the backend agent endpoint.

Preferred flow:

```text
Frontend
   ↓
Backend Agent API
   ↓
AI Agent
   ↓
MCP
   ↓
RecruitBot tools
```

The frontend should NOT directly call MongoDB.

The frontend should NOT directly call the MCP server.

---

# 22. Suggested Agent API

If an agent endpoint does not already exist, create:

```text
POST /api/agent/chat
```

Request:

```json
{
  "message": "Find me a Python developer with machine learning experience"
}
```

Response:

```json
{
  "answer": "I found 3 candidates matching the requested skills.",
  "candidates": [],
  "tools_used": [
    "search_candidates"
  ],
  "sources": []
}
```

When fallback search is used:

```json
{
  "answer": "...",
  "candidates": [],
  "tools_used": [
    "search_candidates",
    "web_search"
  ],
  "sources": []
}
```

Use actual existing candidate/result types where possible.

---

# 23. Data Flow

The complete system should work like this:

```text
┌─────────────────────────────┐
│          Recruiter          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       RecruitBot UI         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Agent API             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          AI Agent           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        MCP Server           │
└───────┬─────────────┬───────┘
        │             │
        ▼             ▼
┌──────────────┐ ┌──────────────┐
│ Candidate    │ │ Web Search   │
│ Search Tool  │ │ Tool         │
└──────┬───────┘ └──────────────┘
       │
       ▼
┌──────────────────────────────┐
│ RecruitBot TypeScript API    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        SearchService         │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
   BM25 Search      Vector Search
       │                │
       └───────┬────────┘
               ▼
          Deduplicate
               ↓
            Rerank
               ↓
        Candidate Results
               │
               ▼
            MCP Tool
               │
               ▼
             Agent
               │
               ▼
            Frontend
```

---

# 24. Environment Variables

Do not hard-code secrets.

Inspect the existing `.env` and environment configuration.

Use existing variables where available.

Potential variables:

```env
RECRUITBOT_API_URL=http://localhost:3000

MISTRAL_API_KEY=...
MISTRAL_EMBED_MODEL=...

MONGODB_URI=...

WEB_SEARCH_API_KEY=...

AGENT_MODEL=...
```

Only add variables that are actually required.

Update:

```text
.env.example
```

with placeholders.

Never commit:

```text
.env
```

---

# 25. Security

Never expose:

* MongoDB connection strings
* Mistral API keys
* LLM API keys
* Web-search API keys
* authentication tokens
* private candidate information unnecessarily

The frontend must never contain server-side API keys.

Use environment variables on the backend/MCP server.

---

# 26. Error Handling

The MCP tools must return structured errors.

Example:

```json
{
  "success": false,
  "error": "RecruitBot API unavailable"
}
```

Do not crash the MCP server because the RecruitBot backend is unavailable.

Candidate search failures should be distinguishable from:

```text
No candidates found
```

For example:

```json
{
  "success": true,
  "count": 0,
  "results": []
}
```

means no results.

Whereas:

```json
{
  "success": false,
  "error": "RECRUITBOT_API_UNAVAILABLE"
}
```

means the service failed.

---

# 27. Logging

Use the existing logging system where possible.

Do not log:

* resume contents
* personal candidate information unnecessarily
* API keys
* authentication tokens

Log useful technical information such as:

```text
MCP tool called
Tool name
Request ID
Duration
Success/failure
Error code
```

Reuse the existing request ID/logging infrastructure if available.

---

# 28. Testing

Add tests for the new functionality.

Minimum tests:

## MCP Candidate Search

Test:

```text
Valid query
Invalid query
Empty query
RecruitBot API unavailable
No candidates found
Successful candidate results
```

## Agent

Test:

```text
Candidate query → search_candidates
Weak retrieval → web_search
Strong retrieval → no unnecessary web search
No candidates → appropriate response
Tool failure → graceful response
```

## Backend

Test:

```text
Agent endpoint accepts request
Agent endpoint returns response
Invalid request is rejected
```

## Frontend

Test:

```text
User enters query
Search is submitted
Loading state appears
Results are displayed
Error state appears
Tool/source information is displayed
```

Use the project's existing testing framework.

Do not introduce a new testing framework unless necessary.

---

# 29. Do Not Break Existing Functionality

Existing RecruitBot functionality must continue working:

```text
Resume Upload
      ↓
Resume Processing
      ↓
Structured Profile
      ↓
Embedding
      ↓
MongoDB
      ↓
Candidate Search
```

Existing search modes must continue working:

```text
BM25
Vector
Hybrid
```

Existing reranking must continue working.

Existing candidate mapping must continue working.

Existing frontend search must continue working.

The MCP/agent functionality should be an additional layer.

---

# 30. Code Reuse Rules

Before creating a new file/function:

1. Search the existing codebase.
2. Check whether the functionality already exists.
3. Reuse it if possible.
4. Extend existing services instead of duplicating them.
5. Only create new abstractions when necessary.

Especially inspect:

```text
SearchService.ts
ResumeRepository.ts
retrievalController.ts
retrievalRoutes.ts
LLMService.ts
RetrievalValidationService.ts
retrieval.types.ts
```

and the existing frontend API/search components.

---

# 31. Important Architectural Rule

Do NOT implement this:

```text
Python MCP
   ↓
Python MongoDB Driver
   ↓
MongoDB
```

if that means duplicating the existing RecruitBot retrieval implementation.

Prefer:

```text
Python MCP
   ↓
RecruitBot HTTP API
   ↓
Existing TypeScript SearchService
   ↓
MongoDB
```

This ensures there is only one implementation of candidate retrieval.

---

# 32. MCP Tool Contract

The candidate MCP tool should have a clear description so the agent understands when to use it.

Example:

```text
search_candidates

Search the RecruitBot resume database for candidates matching a recruiter
requirement. Use this tool when the user wants to find, filter, or compare
candidates based on resume information.
```

The tool should clearly define:

```text
query
top_k
optional filters
```

and return structured candidate results.

---

# 33. Agent Tool Selection

The agent should understand:

```text
search_candidates
```

is for:

```text
Candidates
Resumes
Skills
Experience
Education
Recruitment requirements
Candidate matching
```

while:

```text
web_search
```

is for:

```text
External information
Industry information
Technology information
Role requirements
Additional context
Information not contained in RecruitBot
```

The agent should not use web search instead of RecruitBot when the question is clearly asking for candidates in the RecruitBot database.

---

# 34. Example Queries

The final system should support queries such as:

```text
Find me a Python developer.
```

```text
Find candidates with Python and machine learning experience.
```

```text
Find a candidate with SQL, Power BI and data analytics experience.
```

```text
Find candidates in Johannesburg with Python experience.
```

```text
Which candidates have experience with machine learning?
```

```text
Find candidates suitable for a junior data analyst role.
```

If additional information is needed:

```text
What skills are commonly required for a machine learning engineer?
```

The agent may use web search for external context.

---

# 35. Example Agent Reasoning Flow

Do not expose hidden chain-of-thought.

The implementation should only expose concise tool/status information.

Internal flow:

```text
User asks:
"Find a Python developer with ML experience."

Agent:
→ Call search_candidates

Tool:
→ Search RecruitBot

Tool returns:
→ 5 candidates

Agent:
→ Evaluate returned candidate information

If sufficient:
→ Generate answer

If insufficient:
→ Call web_search if external information is needed

Final:
→ Answer recruiter
```

The UI should not display private chain-of-thought.

---

# 36. Source Awareness

The final response should distinguish:

```text
RecruitBot candidate data
```

from:

```text
External web information
```

For example:

```text
Candidate information:
- Candidate A has Python and ML experience.

External context:
- Python and machine learning are commonly used in data/AI roles.
```

Do not merge external information into a candidate profile.

Never claim:

```text
Candidate A has skill X
```

unless RecruitBot data supports it.

---

# 37. Implementation Sequence

Implement in this order.

## Step 1 — Inspect

Inspect the existing:

```text
retrievalRoutes.ts
retrievalController.ts
SearchService.ts
retrieval.types.ts
frontend API client
frontend search components
```

Do not modify anything yet.

Understand the existing API flow.

---

## Step 2 — Identify Existing Retrieval Endpoint

Determine exactly how the frontend currently calls candidate retrieval.

Document:

```text
HTTP method
Endpoint
Request body
Response structure
```

Reuse it if appropriate.

---

## Step 3 — Create MCP Candidate Tool

Create:

```text
search_candidates
```

The tool should call the existing RecruitBot backend.

---

## Step 4 — Test MCP Tool

Verify:

```text
MCP Server
   ↓
search_candidates
   ↓
RecruitBot API
   ↓
SearchService
   ↓
MongoDB
   ↓
Candidates
```

before implementing the agent.

---

## Step 5 — Add Web Search Tool

Implement:

```text
web_search
```

with configurable provider credentials.

---

## Step 6 — Add Agent

Create the agent that can use:

```text
search_candidates
web_search
```

The agent should choose tools based on the user's request.

---

## Step 7 — Add Agent API

Expose the agent to the frontend through:

```text
POST /api/agent/chat
```

or reuse an existing suitable endpoint.

---

## Step 8 — Update Frontend

Extend the existing RecruitBot UI.

Add:

```text
Natural language query
Search button
Loading state
Agent response
Candidate results
Tools used
Sources
Error handling
```

Do not rebuild the frontend.

---

## Step 9 — Test End-to-End

Verify:

```text
Frontend
 ↓
Agent API
 ↓
Agent
 ↓
MCP
 ↓
search_candidates
 ↓
RecruitBot API
 ↓
SearchService
 ↓
MongoDB
 ↓
Candidate Results
 ↓
Agent
 ↓
Frontend
```

Then test fallback:

```text
Frontend
 ↓
Agent
 ↓
search_candidates
 ↓
Weak/insufficient result
 ↓
web_search
 ↓
Agent
 ↓
Frontend
```

---

# 38. Acceptance Criteria

The implementation is complete when:

### MCP

* MCP server starts successfully.
* `search_candidates` is available.
* `web_search` is available.
* MCP tools return structured data.
* MCP tools handle errors safely.

### Backend

* Existing SearchService is reused.
* Existing BM25 search is reused.
* Existing vector search is reused.
* Existing reranking is reused.
* No duplicate MongoDB retrieval implementation is created.

### Agent

* Agent can call candidate search.
* Agent can determine when additional information is required.
* Agent can call web search when appropriate.
* Agent does not fabricate candidate information.
* Agent distinguishes candidate data from external information.

### Frontend

* Recruiter can submit a natural-language request.
* Loading state is displayed.
* Candidate results are displayed.
* Agent answer is displayed.
* Tools used can be displayed.
* Errors are handled clearly.
* Existing RecruitBot search functionality remains functional.

### Security

* No secrets are hard-coded.
* `.env` remains ignored.
* `.env.example` contains placeholders.
* Candidate information is not unnecessarily logged.

---

# 39. Important Constraint

Do NOT create a new project.

Do NOT create a separate demo RAG system.

Do NOT replace the existing RecruitBot.

Do NOT rewrite the existing SearchService.

Do NOT create duplicate MongoDB vector-search code.

Do NOT create duplicate embedding code.

Do NOT create duplicate BM25 code.

Do NOT rebuild the frontend from scratch.

The goal is:

```text
EXISTING RECRUITBOT
        +
      MCP
        +
       AGENT
        +
   FALLBACK SEARCH
        =
MCP-POWERED AGENTIC RECRUITBOT
```

---

# 40. Final Expected Architecture

```text
                         ┌───────────────┐
                         │   Recruiter   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  RecruitBot   │
                         │   Frontend    │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │   Agent API   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │   AI Agent    │
                         └───────┬───────┘
                                 │
                         MCP Tool Calls
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │ search_candidates│      │    web_search    │
          │    MCP Tool      │      │    MCP Tool      │
          └────────┬─────────┘      └──────────────────┘
                   │
                   │ HTTP
                   ▼
          ┌──────────────────┐
          │ RecruitBot API   │
          │   TypeScript     │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │  SearchService   │
          └────────┬─────────┘
                   │
             ┌─────┴─────┐
             ▼           ▼
           BM25        Vector
             │           │
             └─────┬─────┘
                   ▼
             Deduplicate
                   │
                   ▼
               Reranking
                   │
                   ▼
          Candidate Results
                   │
                   ▼
              MCP Tool
                   │
                   ▼
                 Agent
                   │
                   ▼
               Frontend
```

# 41. Implementation Principle

**Reuse first. Add second. Rewrite last.**

The existing RecruitBot already contains the core RAG functionality.

The new work should mainly add:

```text
MCP tool layer
+
Agent decision layer
+
Fallback retrieval
+
Frontend agent experience
```

The existing RAG remains the foundation.
