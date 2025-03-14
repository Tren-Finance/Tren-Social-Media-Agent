CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Create knowledge table for storing documents and their embeddings
CREATE TABLE IF NOT EXISTS knowledge (
    "id" UUID PRIMARY KEY,
    "agentId" UUID,
    "content" JSONB NOT NULL,
    "embedding" vector(1536),  -- Using OpenAI's embedding dimension
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "isMain" BOOLEAN DEFAULT false,
    "originalId" UUID,
    "chunkIndex" INTEGER,
    "isShared" BOOLEAN DEFAULT false
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS knowledge_embedding_idx ON knowledge USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create cache table for storing embeddings
CREATE TABLE IF NOT EXISTS cache (
    "key" TEXT NOT NULL,
    "agentId" UUID NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("key", "agentId")
);

-- Create index for faster cache lookups
CREATE INDEX IF NOT EXISTS cache_agent_id_idx ON cache ("agentId"); 