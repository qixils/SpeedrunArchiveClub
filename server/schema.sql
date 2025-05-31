CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS videos (
    id BIGINT PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL,
    view_count BIGINT NOT NULL,
    language TEXT,
    type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    title_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', title)) STORED
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_title_fts ON videos USING GIN (title_tsv);

CREATE TABLE IF NOT EXISTS mirrors (
    id BIGINT REFERENCES videos(id),
    source TEXT NOT NULL CHECK (source IN ('INTERNET_ARCHIVE', 'YOUTUBE')),
    url TEXT NOT NULL
);

-- TODO: if not exists
--ALTER TABLE mirrors ADD CONSTRAINT mirrors_unique_id_source_url UNIQUE (id, source, url);
