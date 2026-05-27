import os
import re
import asyncio
import json
import nltk

from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from llama_index.core import Settings
from lancedb.rerankers import RRFReranker
from llama_index.core import VectorStoreIndex
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core import ChatPromptTemplate
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.schema import QueryBundle
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.llms.google_genai import GoogleGenAI
from llama_index.vector_stores.lancedb import LanceDBVectorStore
from llama_index.embeddings.openai_like import OpenAILikeEmbedding
from llama_index.core.schema import TextNode, NodeWithScore

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from dataclasses import dataclass, field
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from pyarabic.araby import strip_tatweel, strip_tashkeel, strip_harakat

from langdetect import detect, DetectorFactory
from camel_tools.tokenizers.word import simple_word_tokenize
from camel_tools.disambig.mle import MLEDisambiguator

# ─────────────────────────────────────────────
# Configuration  —  prefer env vars in production
# ─────────────────────────────────────────────
GOOGLE_API_KEY   = os.environ.get("GOOGLE_API_KEY", "")
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

MONGO_URI        = os.environ.get("MONGO_URI",            "mongodb://127.0.0.1:27017")
DB_NAME          = os.environ.get("DB_NAME",              "weggo")
SESSIONS_COLL    = os.environ.get("SESSIONS_COLLECTION",  "sessions")
LANCEDB_URI      = os.environ.get("LANCEDB_URI",          "../lancedb/semantic-lancedb-qwen3-emb")
EMBED_API_BASE   = os.environ.get("EMBED_API_BASE",       "http://0.0.0.0:8080/v1")
SESSION_TTL_SECS = int(os.environ.get("SESSION_TTL_SECS", 1800))
INTERNAL_SERVICE_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "").strip()

# ─────────────────────────────────────────────
# NLTK bootstrap
# ─────────────────────────────────────────────
nltk.download("punkt",     quiet=True)
nltk.download("wordnet",   quiet=True)
nltk.download("stopwords", quiet=True)

DetectorFactory.seed = 0

# ─────────────────────────────────────────────
# Language helpers
# ─────────────────────────────────────────────
def detect_language(text: str) -> Literal["en", "ar"]:
    try:
        return "ar" if detect(text) == "ar" else "en"
    except Exception:
        return "en"


def clean_text_for_lexical(text: str, lang: str = "en") -> str:
    if lang == "ar":
        return arabic_preprocessor.normalize(text)
    cleaned = english_preprocessor.clean_text(text)
    cleaned = english_preprocessor.remove_stop_words(cleaned)
    cleaned = english_preprocessor.lematize_text(cleaned)
    return cleaned


# ─────────────────────────────────────────────
# Preprocessors
# ─────────────────────────────────────────────
class ListingPreprocessor:
    def __init__(self):
        self.stop_words = set(stopwords.words("english"))
        self.lemmatizer = WordNetLemmatizer()

    def clean_text(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        return re.sub(r"\s+", " ", text).strip()

    def remove_stop_words(self, text: str) -> str:
        return " ".join(t for t in text.split() if t not in self.stop_words)

    def lematize_text(self, text: str) -> str:
        return " ".join(self.lemmatizer.lemmatize(t) for t in text.split())


class ArabicListingPreprocessor:
    def __init__(self):
        self.stop_words    = set(stopwords.words("arabic"))
        self.disambiguator = MLEDisambiguator.pretrained("calima-egy-r13")

    def clean_text(self, text: str) -> str:
        text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
        text = re.sub(r"[إأآا]", "ا", text)
        text = re.sub(r"ى",      "ي", text)
        text = re.sub(r"ة",      "ه", text)
        text = strip_tashkeel(text)
        text = strip_tatweel(text)
        text = strip_harakat(text)
        return re.sub(r"\s+", " ", text).strip()

    def remove_stop_words(self, text: str) -> str:
        return " ".join(t for t in text.split() if t not in self.stop_words)

    def lemmatize_text(self, text: str) -> str:
        if not text.strip():
            return text
        tokens = simple_word_tokenize(text)
        if not tokens:
            return text
        disambiguated = self.disambiguator.disambiguate(tokens)
        lemmas = []
        for word in disambiguated:
            if word.analyses:
                lemma = word.analyses[0].analysis.get("lex", word.word).split("_")[0]
                lemmas.append(lemma)
            else:
                lemmas.append(word.word)
        return " ".join(lemmas)

    def normalize(self, text: str) -> str:
        cleaned    = self.clean_text(text)
        lemmatized = self.lemmatize_text(cleaned)
        lemmatized = self.clean_text(lemmatized)
        return self.remove_stop_words(lemmatized)


# ─────────────────────────────────────────────
# Hybrid Retriever
# ─────────────────────────────────────────────
class PreprocessedHybridRetriever(VectorIndexRetriever):
    async def _aretrieve(self, query_bundle: QueryBundle):
        print("inside async")
        lang   = detect_language(query_bundle.query_str)
        nq     = clean_text_for_lexical(query_bundle.query_str, lang)
        bundle = QueryBundle(
            query_str=nq,
            embedding=query_bundle.embedding,
            custom_embedding_strs=[query_bundle.query_str],
        )
        nodes = await super()._aretrieve(bundle)
        enriched_nodes = []
        for n in nodes:
            listing_id = (
                n.metadata.get("listing_id")
                or n.metadata.get("id")
                or n.node_id
            )
            enriched_text = f"LISTING_ID: {listing_id}\n{n.get_text()}"
            new_node = NodeWithScore(
                node=TextNode(
                    text=enriched_text,
                    metadata=n.metadata,
                    id_=n.node_id,
                ),
                score=n.score,
            )
            enriched_nodes.append(new_node)

        #for i, n in enumerate(enriched_nodes):
        #    print(f"  [{i+1}] score={n.score:.4f} | id={n.node_id} | {n.get_text()[:120]!r}")
        return enriched_nodes

    def _retrieve(self, query_bundle: QueryBundle):
        lang   = detect_language(query_bundle.query_str)
        nq     = clean_text_for_lexical(query_bundle.query_str, lang)
        bundle = QueryBundle(
            query_str=nq,
            embedding=query_bundle.embedding,
            custom_embedding_strs=[query_bundle.query_str],
        )
        return super()._retrieve(bundle)


# ─────────────────────────────────────────────
# Session serialization
# ─────────────────────────────────────────────
def serialize_memory(memory: ChatMemoryBuffer) -> list:
    out = []
    for msg in memory.get():
        if isinstance(msg, ChatMessage):
            out.append({"role": msg.role.value, "content": msg.content})
        elif isinstance(msg, dict):
            out.append({"role": msg.get("role", ""), "content": msg.get("content", "")})
    return out


def deserialize_memory(messages: list) -> ChatMemoryBuffer:
    memory = ChatMemoryBuffer.from_defaults(token_limit=5000)
    for msg in messages:
        if isinstance(msg, dict):
            memory.put(ChatMessage(role=MessageRole(msg["role"]), content=msg["content"]))
        elif isinstance(msg, ChatMessage):
            memory.put(msg)
    return memory


# ─────────────────────────────────────────────
# Router schema
# ─────────────────────────────────────────────
class RouterDecision(BaseModel):
    action:         str  = Field(description="One of: 'search', 'respond', 'off_topic'")
    query:          str  = Field(default="", description="Optimised search query — same language as user, never translated.")
    is_valid_query: bool = Field(default=True)
    invalid_reason: str  = Field(default="")


# ─────────────────────────────────────────────
# MongoDB session store
# ─────────────────────────────────────────────
@dataclass
class UserSession:
    memory: ChatMemoryBuffer = field(
        default_factory=lambda: ChatMemoryBuffer.from_defaults(token_limit=5000)
    )


class MongoSessionStore:
    async def get(self, session_id: str) -> UserSession:
        doc = await sessions_col.find_one({"session_id": session_id})
        if not doc:
            return UserSession()
        return UserSession(memory=deserialize_memory(doc.get("memory", [])))

    async def save(self, session_id: str, session: UserSession):
        await sessions_col.update_one(
            {"session_id": session_id},
            {"$set": {
                "session_id":  session_id,
                "memory":      serialize_memory(session.memory),
                "last_active": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    async def clear(self, session_id: str):
        await sessions_col.delete_one({"session_id": session_id})


async def create_indexes():
    await sessions_col.create_index("last_active", expireAfterSeconds=SESSION_TTL_SECS)


# ─────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────
SYSTEM_PROMPT = """
You are a smart listing assistant for a second-hand marketplace. Your job is to match a user's item description to retrieved listings and return only genuinely relevant results.

You will receive:
1. USER QUERY: A description of the item the user is looking for.
2. RETRIEVED LISTINGS: A set of candidate listings fetched from the database.

---

## YOUR TASK

Evaluate each retrieved listing against the user query and classify it as:

### RELEVANT
The listing matches the core item the user is looking for. Minor differences are acceptable (e.g., slightly different color, a different model year, a close variant) — include these but clearly note the difference.

### NOT RELEVANT
The listing does not match the core item. This includes wrong category, wrong product type, or fundamentally different use case. Exclude these entirely from your response.

---

## RESPONSE FORMAT

Return a JSON object in this exact structure:

{
  "has_results": true | false,
  "results": [
    {
      "listing_id": "<listing id>",
      "title": "<listing title as-is from the retrieved listing, never translated>",
      "price": "<price>",
      "relevance": "exact" | "close",
      "match_note": "<brief explanation in the same language as the user query>"
    }
  ],
  "message": "<A short natural language message in the same language as the user query.>"
}

---

## STRICT RULES

1. If NO retrieved listing is relevant, set has_results to false and return an empty results array.
2. Never fabricate listings. Only use what is provided in RETRIEVED LISTINGS.
3. For "close" matches, always populate match_note with a clear explanation of what differs.
4. Rank results: exact matches first, then close matches.
5. Return ONLY the raw JSON object. No markdown, no code fences, no extra text outside the JSON.
6. Listing fields (title, price, listing_id) must always be copied exactly as provided — never translated or modified.
7. All human-readable text you write (message, match_note) must be in the same language as the user query.
"""

CONTEXT_PROMPT = "USER QUERY:\n{query_str}\n\nRETRIEVED LISTINGS:\n{context_str}"

ROUTER_SYSTEM = """
You are a routing assistant for a second-hand marketplace chatbot.

Given the conversation history and the new user message, decide the action:

- "search": user wants to find listings (new item, changed criteria, fresh search)
- "respond": user is following up on already shown listings (price, condition, comparisons)
- "off_topic": user's message is unrelated to buying/selling second-hand items

VALIDITY CHECK:
Set is_valid_query=false if the product name is gibberish or fictional.
Set is_valid_query=true for real products even if misspelled.

LANGUAGE RULE: Search query MUST stay in the same language as the user's message. NEVER translate.

CRITICAL: You are a backend router only. ONLY output the routing decision schema.
"""

CONVERSATIONAL_SYSTEM = """
You are a helpful assistant for a second-hand marketplace.
Answer the user's question based on the conversation history.
The listings already shown to the user are in the chat history above.
Do not invent new listings.
"""

# ─────────────────────────────────────────────
# Module-level singletons (populated at startup)
# ─────────────────────────────────────────────
english_preprocessor: ListingPreprocessor        = None
arabic_preprocessor:  ArabicListingPreprocessor  = None
llm:                  GoogleGenAI                = None
listings_engine:      RetrieverQueryEngine       = None
mongo_client:         AsyncIOMotorClient         = None
db                                               = None
sessions_col                                     = None
session_store:        MongoSessionStore          = None

# Per-session asyncio locks — prevents race conditions when two requests
# for the same session_id arrive simultaneously.
_session_locks: dict[str, asyncio.Lock] = {}
_locks_meta_lock = asyncio.Lock()       # guards the dict itself


async def get_session_lock(session_id: str) -> asyncio.Lock:
    async with _locks_meta_lock:
        if session_id not in _session_locks:
            _session_locks[session_id] = asyncio.Lock()
        return _session_locks[session_id]


# ─────────────────────────────────────────────
# Startup / shutdown via lifespan
# ─────────────────────────────────────────────
def _init_ml_components():
    global english_preprocessor, arabic_preprocessor, llm, listings_engine

    english_preprocessor = ListingPreprocessor()
    arabic_preprocessor  = ArabicListingPreprocessor()

    llm = GoogleGenAI(
        model="models/gemini-2.5-flash",
        thinking_level="low",
        reasoning_effort="low",
        temperature=0.3,
        top_p=0.95,
    )

    embed_model = OpenAILikeEmbedding(
        model_name="dengcao/Qwen3-Embedding-0.6B:Q8_0",
        api_base=EMBED_API_BASE,
        api_key="fake",
        query_instruction="Given a query, retrieve relevant passages that answer the query",
    )

    Settings.llm         = llm
    Settings.embed_model = embed_model

    reranker     = RRFReranker()
    vector_store = LanceDBVectorStore(
        uri=LANCEDB_URI, table_name="listings",
        nprobes=5, refine_factor=30,
        reranker=reranker, query_type="hybrid",
        doc_id_key="id", text_key="normalized_text",
        vector_column_name="vector", metric="cosine",
        language="English", stem=False,
        remove_stopwords=False, lower_case=False,
    )

    index     = VectorStoreIndex.from_vector_store(vector_store, embed_model)
    retriever = PreprocessedHybridRetriever(
        index=index,
        vector_store_query_mode="hybrid",
        similarity_top_k=4,
        vector_store_kwargs={},
    )

    text_qa_template = ChatPromptTemplate([
        ChatMessage(role=MessageRole.SYSTEM, content=SYSTEM_PROMPT),
        ChatMessage(role=MessageRole.USER,   content=CONTEXT_PROMPT),
    ])

    listings_engine = RetrieverQueryEngine.from_args(
        retriever=retriever,
        llm=llm,
        text_qa_template=text_qa_template,
        verbose=False,
    )


async def _init_mongo():
    global mongo_client, db, sessions_col, session_store
    mongo_client  = AsyncIOMotorClient(MONGO_URI)
    db            = mongo_client[DB_NAME]
    sessions_col  = db[SESSIONS_COLL]
    session_store = MongoSessionStore()
    await create_indexes()
    print("MongoDB connected.")

'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────
    _init_ml_components()   # synchronous (model loading)
    await _init_mongo()     # async (DB connection)
    print("App ready.")
    yield
    # ── shutdown ─────────────────────────────
    if mongo_client:
        mongo_client.close()
    print("App shut down.")
'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        _init_ml_components()
        await _init_mongo()
        print("App ready.")
    except Exception as e:
        import traceback
        print("STARTUP FAILED:", traceback.format_exc())
        raise   # re-raise so uvicorn reports it clearly
    yield
    if mongo_client:
        mongo_client.close()
    print("App shut down.")

# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(title="Marketplace Chatbot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to your domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_internal_auth(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    if INTERNAL_SERVICE_TOKEN:
        token = request.headers.get("X-Internal-Auth", "")
        if token != INTERNAL_SERVICE_TOKEN:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"error": "Unauthorized"})

    return await call_next(request)


# ─────────────────────────────────────────────
# Core chat logic
# ─────────────────────────────────────────────
async def route(user_message: str, history: list) -> RouterDecision:
    messages = [
        ChatMessage(role=MessageRole.SYSTEM, content=ROUTER_SYSTEM),
        *history,
        ChatMessage(role=MessageRole.USER, content=user_message),
    ]
    return await llm.astructured_predict(
        RouterDecision,
        prompt=ChatPromptTemplate(messages),
    )


async def chat(session_id: str, user_message: str) -> str:
    # Acquire per-session lock so concurrent requests for the same user
    # are serialised — prevents memory read/write races.
    lock = await get_session_lock(session_id)
    async with lock:
        session  = await session_store.get(session_id)
        history  = session.memory.get()
        decision = await route(user_message, history)

        if decision.action == "off_topic":
            assistant_reply = (
                "I'm only able to help you find second-hand listings. "
                "Feel free to ask me about any item you're looking for!"
            )
        elif not decision.is_valid_query:
            assistant_reply = (
                f"I couldn't recognise that as a real product — {decision.invalid_reason}. "
                "Could you describe the item you're looking for?"
            )
        elif decision.action == "search":
            query           = decision.query or user_message
            response        = await listings_engine.aquery(query)
            assistant_reply = str(response)
        else:  # "respond"
            messages = [
                ChatMessage(role=MessageRole.SYSTEM, content=CONVERSATIONAL_SYSTEM),
                *history,
                ChatMessage(role=MessageRole.USER, content=user_message),
            ]
            conv_response   = await llm.achat(messages)
            assistant_reply = conv_response.message.content

        session.memory.put(ChatMessage(role=MessageRole.USER,      content=user_message))
        session.memory.put(ChatMessage(role=MessageRole.ASSISTANT, content=assistant_reply))
        await session_store.save(session_id, session)

    return assistant_reply


# ─────────────────────────────────────────────
# Request / response schemas
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, description="Unique user/session identifier")
    message:    str = Field(..., min_length=1, description="User's message")

class ChatResponse(BaseModel):
    session_id: str
    reply:      str


async def stream_chat(session_id: str, user_message: str):
    reply = await chat(session_id, user_message)
    yield f"data: {json.dumps({'type': 'reply', 'response': reply})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(body: ChatRequest):
    """
    Send a message and receive a chatbot reply.

    `reply` is a JSON string for search results, or plain text for
    conversational / error responses. Parse with JSON.parse() on the
    frontend, catching the exception for plain-text cases.
    """
    try:
        reply = await chat(body.session_id, body.message)
        return ChatResponse(session_id=body.session_id, reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def stream_chat_endpoint(body: ChatRequest):
    try:
        return StreamingResponse(
            stream_chat(body.session_id, body.message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache, no-transform",
                "Connection": "keep-alive",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear a user's conversation history."""
    try:
        await session_store.clear(session_id)
        # Also drop the per-session lock entry to avoid unbounded growth
        async with _locks_meta_lock:
            _session_locks.pop(session_id, None)
        return {"status": "cleared", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
