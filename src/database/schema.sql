-- My Circle Database Schema
-- This file contains all table definitions for the My Circle application

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  real_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone_e164 VARCHAR(20) UNIQUE,
  google_sub VARCHAR(255) UNIQUE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  circle_count INTEGER DEFAULT 0,
  notification_preferences JSONB DEFAULT '{"posts": true, "comments": true, "digest_enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_phone_e164 ON users(phone_e164);
CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_users_real_name ON users(real_name);
CREATE INDEX idx_users_status ON users(status) WHERE status = 'active';

-- ============================================================================
-- INVITES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invites (
  id BIGSERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  inviter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invites
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_expires_at ON invites(expires_at);

-- ============================================================================
-- CONNECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS connections (
  id BIGSERIAL PRIMARY KEY,
  user_a_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state VARCHAR(20) DEFAULT 'pending' CHECK (state IN ('pending', 'active', 'ended')),
  type VARCHAR(20) DEFAULT 'permanent' CHECK (type IN ('permanent', 'temporary')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_reason VARCHAR(50),
  reconfirm_a_at TIMESTAMPTZ,
  reconfirm_b_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent self-connections
  CONSTRAINT not_self_connection CHECK (user_a_id <> user_b_id)
);

-- Unique index to ensure no duplicate connections between same two users
CREATE UNIQUE INDEX idx_connections_unique_pair ON connections(
  LEAST(user_a_id, user_b_id),
  GREATEST(user_a_id, user_b_id)
);

-- Indexes for connections
CREATE INDEX idx_connections_user_a_state ON connections(user_a_id, state);
CREATE INDEX idx_connections_user_b_state ON connections(user_b_id, state);
CREATE INDEX idx_connections_expires_at ON connections(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT CHECK (LENGTH(caption) <= 2200),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('post', 'reel')),
  comments_enabled BOOLEAN DEFAULT true,
  client_id VARCHAR(255),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX idx_posts_owner_created ON posts(owner_user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_owner_created_deleted ON posts(owner_user_id, created_at DESC, deleted_at);
CREATE INDEX idx_posts_client_id ON posts(owner_user_id, client_id) WHERE client_id IS NOT NULL;

-- ============================================================================
-- POST_MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_media (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_key VARCHAR(500) NOT NULL,
  cdn_url TEXT NOT NULL,
  position INTEGER NOT NULL,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for post_media
CREATE INDEX idx_post_media_post_position ON post_media(post_id, position);

-- ============================================================================
-- POST_SEEN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_seen (
  viewer_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (viewer_user_id, post_id)
);

-- Indexes for post_seen
CREATE INDEX idx_post_seen_viewer_seen ON post_seen(viewer_user_id, seen_at DESC);

-- ============================================================================
-- POST_REACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_reactions (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  actor_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) NOT NULL,
  visibility_scope VARCHAR(20) DEFAULT 'circle' CHECK (visibility_scope IN ('circle', 'owner_only')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_post_reaction UNIQUE (post_id, actor_user_id, reaction_type)
);

-- Indexes for post_reactions
CREATE INDEX idx_post_reactions_post_created ON post_reactions(post_id, created_at);
CREATE INDEX idx_post_reactions_actor_created ON post_reactions(actor_user_id, created_at);

-- ============================================================================
-- POST_COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  commenter_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (LENGTH(body) <= 1000),
  visibility_scope VARCHAR(20) DEFAULT 'circle' CHECK (visibility_scope IN ('circle', 'owner_only')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for post_comments
CREATE INDEX idx_post_comments_post_created ON post_comments(post_id, created_at);
CREATE INDEX idx_post_comments_commenter_created ON post_comments(commenter_user_id, created_at);

-- ============================================================================
-- NOTIFICATION_DIGEST_QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  new_posts_count INTEGER DEFAULT 0,
  new_comments_count INTEGER DEFAULT 0,
  payload JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_digest UNIQUE (user_id, digest_date)
);

-- Indexes for notification_digest_queue
CREATE INDEX idx_notification_queue_status ON notification_digest_queue(status);

-- ============================================================================
-- USER_DEVICES TABLE (for FCM tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_devices
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
