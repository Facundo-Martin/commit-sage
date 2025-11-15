# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Commit Sage** is a production-ready SaaS application that analyzes GitHub repositories using AI to provide intelligent commit summaries and insights. Built with the T3 Stack (Next.js 15, tRPC, Drizzle ORM, Tailwind CSS) and designed to showcase modern full-stack development skills.

### Core Value Proposition

- **Input**: GitHub repository URL
- **Process**: Fetch commits → Analyze with AI → Generate summaries
- **Output**: Beautiful dashboard with commit insights, summaries, and analytics

### Key Objectives

1. Demonstrate expertise with cutting-edge tech stack
2. Integrate multiple AI providers with graceful fallbacks
3. Build production-grade SaaS with authentication, billing, and usage tracking
4. Create polished UI/UX with streaming AI responses
5. Implement best practices: TypeScript strict mode, tRPC type safety, proper error handling

## Tech Stack

### Core Framework

- **Next.js 15**: App Router, React Server Components, Server Actions
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`
- **Turbopack**: Fast dev server and HMR
- **React 19**: Latest React features

### Database & ORM

- **PostgreSQL**: Via NeonDB (serverless, auto-scaling) or local Docker
- **Drizzle ORM**: Type-safe, performant SQL toolkit
- **pgvector Extension**: Vector embeddings for semantic search (future feature)

### API Layer

- **tRPC v11**: End-to-end type safety for API routes
- **TanStack Query**: Server state management with React Query

### Authentication

- **Clerk**: Pre-built UI components, multiple auth providers, no webhook syncing required

### AI Integration

- **Vercel AI SDK v4** (`ai` package): Multi-provider support, streaming responses, token tracking
- **Supported Models**: OpenAI GPT-4o/mini, Anthropic Claude Sonnet, Google Gemini Flash
- **AI Gateway**: Unified interface with fallback strategies

### UI & Styling

- **Tailwind CSS 4**: Utility-first styling
- **shadcn/ui**: High-quality, customizable React components
- **Radix UI**: Accessible primitives
- **Lucide Icons**: Icon system
- **next-themes**: Dark/light mode support

### GitHub Integration

- **Octokit**: Official GitHub REST/GraphQL API client

## Development Commands

### Core Commands

- `bun dev` - Start development server with Turbo mode
- `bun build` - Build production application
- `bun start` - Start production server
- `bun preview` - Build and start production server

### Code Quality

- `bun check` - Run ESLint and TypeScript checks (recommended before commits)
- `bun lint` - Run ESLint
- `bun lint:fix` - Run ESLint with auto-fix
- `bun typecheck` - Run TypeScript compiler checks without emitting files
- `bun format:check` - Check code formatting with Prettier
- `bun format:write` - Format code with Prettier

### Database Commands

- `./start-database.sh` - Start local PostgreSQL database in Docker/Podman container
- `bun db:push` - Push schema changes to database (development only)
- `bun db:generate` - Generate Drizzle migration files (for production)
- `bun db:migrate` - Run database migrations (for production)
- `bun db:studio` - Open Drizzle Studio for visual database management

## Database Schema

All tables use the `commit-sage_` prefix via the `createTable` helper. This allows multiple projects to share the same database instance.

### Core Models

**User** (extended from Clerk):

```typescript
user {
  id: string              // Clerk user ID
  createdAt: timestamp
  updatedAt: timestamp
  credits: integer        // Default: 150 (freemium)
  plan: enum              // 'free', 'pro', 'enterprise'
  stripeCustomerId: string (optional)
}
```

**Project** (GitHub repository):

```typescript
project {
  id: string              // CUID
  createdAt: timestamp
  updatedAt: timestamp
  name: string
  githubUrl: string
  githubOwner: string     // Extracted from URL
  githubRepo: string      // Extracted from URL
  description: string (optional)
  lastSyncedAt: timestamp (optional)
  userId: string          // FK to user
  isPublic: boolean       // Default: false
}
```

**Commit** (analyzed commits):

```typescript
commit {
  id: string              // CUID
  createdAt: timestamp
  updatedAt: timestamp
  projectId: string       // FK to project
  sha: string             // GitHub commit hash
  message: string
  authorName: string
  authorEmail: string
  authorAvatarUrl: string (optional)
  committedAt: timestamp
  summary: string (optional)        // AI-generated summary
  embedding: vector(1536) (optional) // pgvector for semantic search
  filesChanged: integer
  additions: integer
  deletions: integer
  aiModel: string (optional)        // Which model generated summary
  creditsUsed: integer              // Default: 0
}
```

**Credit Usage Log**:

```typescript
creditUsage {
  id: string              // CUID
  createdAt: timestamp
  userId: string          // FK to user
  projectId: string (optional)
  commitId: string (optional)
  amount: integer         // Credits consumed
  operation: string       // 'commit_analysis', 'insight_generation'
  model: string           // Which AI model was used
}
```

### Important Indexes

- `project.userId` - Fast user project lookups
- `commit.projectId` - Fast commit queries per project
- `commit.sha` - Prevent duplicate commits (unique constraint)
- `creditUsage.userId` - Usage analytics

## Project Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (sign-in, sign-up)
│   ├── (marketing)/              # Public pages (landing, pricing)
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Projects overview
│   │   ├── [projectId]/          # Individual project pages
│   │   │   ├── page.tsx          # Project dashboard
│   │   │   ├── commits/          # Commit list & details
│   │   │   ├── insights/         # AI-generated insights
│   │   │   └── settings/         # Project settings
│   │   ├── billing/              # Subscription management
│   │   └── settings/             # User settings
│   ├── api/
│   │   ├── trpc/[trpc]/          # tRPC API endpoint
│   │   └── webhooks/             # Webhook handlers (Clerk, Stripe)
│   └── layout.tsx                # Root layout with providers
│
├── server/
│   ├── api/
│   │   ├── routers/              # tRPC routers
│   │   │   ├── project.ts        # Project CRUD operations
│   │   │   ├── commit.ts         # Commit fetching & AI analysis
│   │   │   ├── user.ts           # User profile & credits
│   │   │   └── billing.ts        # Credit purchases, usage tracking
│   │   ├── trpc.ts               # tRPC config, procedures, middleware
│   │   └── root.ts               # Main router aggregation
│   └── db/
│       ├── index.ts              # Drizzle client instance
│       └── schema.ts             # Database schema definitions
│
├── lib/
│   ├── ai/
│   │   ├── providers.ts          # AI provider configurations
│   │   ├── prompts.ts            # System prompts for commit analysis
│   │   └── stream.ts             # Streaming utilities
│   ├── github/
│   │   ├── client.ts             # Octokit instance
│   │   ├── commits.ts            # Fetch commits, diffs, files
│   │   └── types.ts              # GitHub API types
│   ├── utils.ts                  # Utility functions (cn, formatters)
│   └── constants.ts              # App constants
│
├── components/
│   ├── ui/                       # shadcn components
│   ├── dashboard/                # Dashboard-specific components
│   ├── marketing/                # Landing page components
│   └── shared/                   # Shared components
│
├── hooks/                        # Custom React hooks
│   ├── use-credits.ts
│   ├── use-ai-stream.ts
│   └── use-github-data.ts
│
├── trpc/
│   ├── react.tsx                 # Client-side tRPC provider
│   ├── server.ts                 # Server-side tRPC caller
│   └── query-client.ts           # React Query configuration
│
└── env.js                        # Environment variable validation
```

### tRPC Setup

The application uses a dual-client tRPC architecture:

**Server-side (RSC)**:

- Use `import { api } from "@/trpc/server"` in Server Components
- Direct server-side API calls without HTTP overhead
- Initialized in `src/trpc/server.ts` with `createHydrationHelpers`

**Client-side**:

- Use `import { api } from "@/trpc/react"` in Client Components
- Requires `TRPCReactProvider` wrapper in root layout
- Configured with React Query for caching and optimistic updates
- Initialized in `src/trpc/react.tsx`

**Adding New API Routes**:

1. Create router file in `src/server/api/routers/`
2. Define procedures using `publicProcedure` or `protectedProcedure` from `src/server/api/trpc.ts`
3. Use Zod for input validation
4. Register router in `src/server/api/root.ts` by adding to `appRouter`

**Example tRPC Router**:

```typescript
// src/server/api/routers/project.ts
export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        githubUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [owner, repo] = parseGitHubUrl(input.githubUrl);

      const project = await ctx.db
        .insert(projectTable)
        .values({
          userId: ctx.userId,
          name: repo,
          githubUrl: input.githubUrl,
          githubOwner: owner,
          githubRepo: repo,
        })
        .returning();

      return project[0];
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.project.findMany({
      where: eq(projectTable.userId, ctx.userId),
      orderBy: desc(projectTable.createdAt),
    });
  }),
});
```

### Authentication with Clerk

**tRPC Context** (`src/server/api/trpc.ts`):

```typescript
import { auth } from "@clerk/nextjs/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return {
    db,
    userId: session?.userId ?? null,
  };
};

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      userId: ctx.userId, // Non-null userId guaranteed
    },
  });
});
```

**Middleware** (`src/middleware.ts`):

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### AI Integration Patterns

**Provider Configuration** (`src/lib/ai/providers.ts`):

```typescript
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export const AI_MODELS = {
  primary: openai("gpt-4o"),
  fast: openai("gpt-4o-mini"),
  fallback: anthropic("claude-3-5-sonnet-20241022"),
  budget: google("gemini-2.0-flash-exp"),
} as const;

export const getModelForTask = (task: "commit" | "insight" | "chat") => {
  switch (task) {
    case "commit":
      return AI_MODELS.fast; // GPT-4o-mini
    case "insight":
      return AI_MODELS.primary; // GPT-4o
    case "chat":
      return AI_MODELS.fast;
    default:
      return AI_MODELS.fast;
  }
};
```

**Streaming AI Response in Server Action**:

```typescript
"use server";

import { streamText } from "ai";
import { createStreamableValue } from "ai/rsc";

export async function analyzeCommitStream(commitDiff: string) {
  const stream = createStreamableValue("");

  (async () => {
    const { textStream } = await streamText({
      model: openai("gpt-4o-mini"),
      prompt: `Analyze this commit:\n\n${commitDiff}`,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}
```

**Note**: AI streaming must use Server Actions or Route Handlers, **not tRPC** (tRPC doesn't support streaming responses).

### GitHub Integration

**Fetching Commits** (`src/lib/github/commits.ts`):

```typescript
import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function fetchRecentCommits(owner: string, repo: string) {
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    per_page: 100,
  });

  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    authorName: commit.commit.author?.name,
    authorEmail: commit.commit.author?.email,
    authorAvatarUrl: commit.author?.avatar_url,
    committedAt: new Date(commit.commit.author?.date),
    filesChanged: commit.files?.length ?? 0,
  }));
}
```

**Rate Limits**:

- Unauthenticated: 60 requests/hour
- Authenticated with personal token: 5,000 requests/hour
- Always use `GITHUB_TOKEN` for API calls

### Credit System

**Free Tier**:

- 150 credits on signup
- ~150 commit analyses (1 credit each with GPT-4o-mini)

**Credit Deduction Pattern**:

```typescript
// Before AI call
const userCredits = await db.query.user.findFirst({
  where: eq(user.id, userId),
  columns: { credits: true },
});

if (userCredits.credits < COST_PER_COMMIT) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Insufficient credits",
  });
}

// After AI call
await db
  .update(user)
  .set({ credits: sql`${user.credits} - ${creditsUsed}` })
  .where(eq(user.id, userId));
```

## Environment Variables

Create `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://..."

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# GitHub
GITHUB_TOKEN="ghp_..."

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_GENERATIVE_AI_API_KEY="..."

# Optional: Stripe for billing
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

**Important**: All environment variables must be validated in `src/env.js` using `@t3-oss/env-nextjs`. Add new variables to:

1. The appropriate schema object (`server` or `client`)
2. The `runtimeEnv` mapping object

## Database Setup

### Local Development

1. Copy `.env.example` to `.env`
2. Run `./start-database.sh` to start PostgreSQL container
3. Run `bun db:push` to sync schema to database

The start script automatically parses `DATABASE_URL` from `.env` and generates a secure password if using the default.

### Production (NeonDB)

1. Create project at [neon.tech](https://neon.tech)
2. Enable pgvector extension in Neon dashboard (for future semantic search)
3. Update `DATABASE_URL` in `.env` with Neon connection string
4. Run `bun db:generate` to create migrations
5. Run `bun db:migrate` to apply migrations

## Feature Implementation Roadmap

### Phase 1: Core MVP

- [x] Project setup with T3 stack
- [ ] Database schema with Drizzle
- [ ] Clerk authentication
- [ ] GitHub OAuth integration
- [ ] Fetch commits from public repos
- [ ] Basic AI commit summarization (streaming)
- [ ] Simple dashboard UI

### Phase 2: Credits & Billing

- [ ] Credit system implementation
- [ ] Usage tracking per user
- [ ] Credit purchase flow (Stripe or Clerk billing)
- [ ] Usage analytics dashboard

### Phase 3: Enhanced AI Features

- [ ] Multi-model support via AI Gateway
- [ ] Streaming UI for real-time summaries
- [ ] Insight generation (trends, patterns)
- [ ] Chat with repository (RAG)

### Phase 4: Vector Search (Optional)

- [ ] Generate embeddings for commits
- [ ] Semantic search across commits
- [ ] "Find similar changes" feature

### Phase 5: Polish & Deploy

- [ ] Landing page with marketing copy
- [ ] Pricing page
- [ ] Performance optimization
- [ ] SEO & social sharing
- [ ] Deploy to Vercel

## Important Notes & Best Practices

### Database

- Always use transactions for credit deduction to prevent race conditions
- Run `bun db:push` after schema changes (dev) or `bun db:generate && bun db:migrate` (prod)

### tRPC

- The timing middleware adds artificial 100-400ms delays in development to catch request waterfalls
- SuperJSON is used as the transformer to handle Date objects and non-JSON types
- Zod validation errors are automatically formatted and sent to frontend with type safety
- All tRPC procedures must use Zod for input validation

### AI Integration

- Use Server Actions or Route Handlers for streaming responses (not tRPC)
- Track token usage for billing transparency
- Implement fallback providers for reliability
- Store AI model used in database for analytics

### Authentication

- Clerk's `userId` is used directly in our database
- User session available in tRPC context via `ctx.userId`
- Use `protectedProcedure` for authenticated routes

### Common Gotchas

1. **Drizzle Schema Changes**: Always run `bun db:push` after schema updates
2. **Environment Variables**: Must restart dev server after `.env` changes
3. **GitHub Rate Limits**: Use authenticated requests to get 5,000 req/hour
4. **pgvector**: Requires Postgres extension enabled
5. **AI Streaming**: Cannot use tRPC for streaming, use Server Actions instead

---

**Last Updated**: 2025-01-15
**Project Status**: Initial setup complete → Ready to implement core features
