/**
 * Database Schema for Commit Sage
 *
 * This file defines all database tables using Drizzle ORM.
 * Each table is defined using pgTable directly (no table prefix).
 *
 * Key Features:
 * - Type-safe schema definitions
 * - Automatic timestamp management (createdAt, updatedAt)
 * - Foreign key relationships with cascade deletes
 * - Proper indexes for query performance
 * - pgvector support for semantic search
 * - CUID2 for unique identifiers
 */

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ============================================================================
// Reusable Schema Helpers
// ============================================================================

/**
 * Standard timestamp fields for audit tracking
 * Includes automatic createdAt and updatedAt management
 */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ============================================================================
// Enums
// ============================================================================

/**
 * User subscription plan levels
 * - free: Default plan with 150 credits
 * - pro: Paid plan with higher credit limits
 * - enterprise: Custom enterprise plan
 */
export const planEnum = pgEnum("plan", ["free", "pro", "enterprise"]);

// ============================================================================
// User Table
// ============================================================================

/**
 * User table - extends Clerk authentication with app-specific data
 *
 * Note: We don't manage user creation/deletion here.
 * Clerk handles authentication, and we store additional user data.
 */
export const user = pgTable(
  "user",
  {
    // Clerk user ID (not auto-generated, comes from Clerk)
    id: text("id").primaryKey(),
    ...timestamps,
    credits: integer("credits").notNull().default(150),
    plan: planEnum("plan").notNull().default("free"),
  },
  (table) => [
    // Index for credit usage queries
    index("user_credits_idx").on(table.credits),
  ],
);

// ============================================================================
// Project Table
// ============================================================================

/**
 * Project table - represents a GitHub repository being analyzed
 *
 * Each project is owned by a user and contains commits.
 * Projects can be public (visible to all) or private (owner only).
 */
export const project = pgTable(
  "project",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ...timestamps,
    name: text("name").notNull(),
    githubUrl: text("github_url").notNull(),
    githubOwner: text("github_owner").notNull(),
    githubRepo: text("github_repo").notNull(),
    description: text("description"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: boolean("is_public").notNull().default(false),
  },
  (table) => [
    // CRITICAL: Index for fast user project lookups
    index("project_user_id_idx").on(table.userId),
    // Index for GitHub URL uniqueness checks per user
    index("project_github_url_idx").on(table.githubUrl),
    // Index for finding projects by owner/repo combination
    index("project_github_owner_repo_idx").on(
      table.githubOwner,
      table.githubRepo,
    ),
    // Index for public project queries
    index("project_is_public_idx").on(table.isPublic),
    // Index for recently synced projects
    index("project_last_synced_at_idx").on(table.lastSyncedAt),
  ],
);

// ============================================================================
// Commit Table
// ============================================================================

/**
 * Commit table - stores analyzed commits from GitHub repositories
 *
 * Each commit belongs to a project and can have an AI-generated summary.
 * Embeddings are stored for semantic search capabilities.
 */
export const commit = pgTable(
  "commit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    ...timestamps,
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    // Git commit hash
    sha: text("sha").notNull(),
    message: text("message").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    authorAvatarUrl: text("author_avatar_url"),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull(),
    summary: text("summary"),
    // OpenAI embedding size
    embedding: vector("embedding", { dimensions: 1536 }),
    aiModel: text("ai_model"),
    filesChanged: integer("files_changed").notNull().default(0),
    additions: integer("additions").notNull().default(0),
    deletions: integer("deletions").notNull().default(0),
    creditsUsed: integer("credits_used").notNull().default(0),
  },
  (table) => [
    // CRITICAL: Index for fast project commit lookups
    index("commit_project_id_idx").on(table.projectId),
    // CRITICAL: Unique constraint to prevent duplicate commits
    uniqueIndex("commit_sha_project_id_idx").on(table.sha, table.projectId),
    // Index for chronological commit queries
    index("commit_committed_at_idx").on(table.committedAt),
    // Index for finding commits by author
    index("commit_author_email_idx").on(table.authorEmail),
    // Index for AI model analytics
    index("commit_ai_model_idx").on(table.aiModel),
    // TODO: Add vector index for semantic search when pgvector is enabled
    // This requires: CREATE INDEX ON commit USING ivfflat (embedding vector_cosine_ops);
  ],
);

// ============================================================================
// Credit Usage Table
// ============================================================================

/**
 * Credit usage log - tracks all credit consumption for analytics and auditing
 *
 * This table provides transparency into credit usage and helps with:
 * - User billing and usage analytics
 * - AI model cost tracking
 * - Feature usage patterns
 */
export const creditUsage = pgTable(
  "credit_usage",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    // Timestamp (only createdAt, no updates)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Optional relationships for context
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    commitId: text("commit_id").references(() => commit.id, {
      onDelete: "set null",
    }),
    amount: integer("amount").notNull(),
    // e.g., 'commit_analysis', 'insight_generation'
    operation: text("operation").notNull(),
    model: text("model").notNull(),
  },
  (table) => [
    // CRITICAL: Index for user usage analytics
    index("credit_usage_user_id_idx").on(table.userId),
    // Index for project usage analytics
    index("credit_usage_project_id_idx").on(table.projectId),
    // Index for time-based usage queries
    index("credit_usage_created_at_idx").on(table.createdAt),
    // Index for operation type analytics
    index("credit_usage_operation_idx").on(table.operation),
    // Index for model cost analytics
    index("credit_usage_model_idx").on(table.model),
    // Composite index for user usage over time
    index("credit_usage_user_created_idx").on(table.userId, table.createdAt),
  ],
);

// ============================================================================
// Type Exports
// ============================================================================

/**
 * TypeScript types inferred from the schema
 * Use these for type-safe database operations
 */
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Project = typeof project.$inferSelect;
export type NewProject = typeof project.$inferInsert;

export type Commit = typeof commit.$inferSelect;
export type NewCommit = typeof commit.$inferInsert;

export type CreditUsage = typeof creditUsage.$inferSelect;
export type NewCreditUsage = typeof creditUsage.$inferInsert;
