-- Minimal disposable MySQL schema for the real cinema public/override code.
-- This is not a production schema migration or a copy of school records.
CREATE TABLE kino_screenings (
    id INT PRIMARY KEY,
    title VARCHAR(220) NOT NULL,
    provider VARCHAR(40) NOT NULL,
    video_ref TEXT NOT NULL,
    start_utc BIGINT NOT NULL,
    end_utc BIGINT NOT NULL,
    poster_url TEXT NOT NULL,
    fsk_age INT NULL
);
CREATE TABLE kino_override_state (
    id INT PRIMARY KEY,
    active INT NOT NULL,
    screening_id INT NULL,
    offset_sec INT NOT NULL,
    set_at BIGINT NOT NULL,
    paused INT NOT NULL,
    pause_started_at BIGINT NULL,
    paused_total_sec INT NOT NULL
);
INSERT INTO kino_override_state VALUES (1,0,NULL,0,0,0,NULL,0);
CREATE TABLE kino_chat_settings (
    id INT PRIMARY KEY,
    enabled INT NOT NULL DEFAULT 0,
    allow_viewer_toggle INT NOT NULL DEFAULT 1,
    retention_hours INT NOT NULL DEFAULT 24,
    max_length INT NOT NULL DEFAULT 280,
    updated_at BIGINT NOT NULL DEFAULT 0
);
INSERT INTO kino_chat_settings(id) VALUES (1);
CREATE TABLE kino_client_error_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    created_at BIGINT NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    source TEXT NOT NULL,
    mode VARCHAR(40) NOT NULL,
    provider VARCHAR(60) NOT NULL,
    screening_id INT NULL,
    title TEXT NOT NULL,
    client_session TEXT NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent TEXT NOT NULL,
    page_url TEXT NOT NULL,
    video_ref_hash VARCHAR(64) NOT NULL,
    video_ref_preview TEXT NOT NULL,
    details_json TEXT NOT NULL
);
