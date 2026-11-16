ALTER TABLE links ADD COLUMN provider TEXT NOT NULL DEFAULT 'edf';
UPDATE links SET provider = scheme_id WHERE scheme_id <> 'edf';
ALTER TABLE claim_tokens ADD COLUMN provider TEXT NOT NULL DEFAULT 'edf';
UPDATE claim_tokens SET provider = scheme_id WHERE scheme_id <> 'edf';
ALTER TABLE handouts ADD COLUMN provider TEXT NOT NULL DEFAULT 'edf';
UPDATE handouts SET provider = scheme_id WHERE scheme_id <> 'edf';
ALTER TABLE queue_settings ADD COLUMN provider TEXT NOT NULL DEFAULT 'edf';
UPDATE queue_settings SET provider = scheme_id WHERE scheme_id <> 'edf';
