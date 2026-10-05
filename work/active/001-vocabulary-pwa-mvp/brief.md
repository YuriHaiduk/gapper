# Brief — original requirements (verbatim, 2026-10-05)

> Read-only record of the owner's initial request. Product decisions derived from it live in `docs/SPEC.md`.

---

I want to build a personal vocabulary-learning PWA. Before writing any application code, analyze the requirements below and create two project files:

1. `SPEC.md` — a detailed product and technical specification for the application.
2. `CLAUDE.md` — project-level instructions for Claude Code describing the stack, architecture, conventions, constraints, development workflow, and rules that must be followed during implementation.

Do not implement the application yet.

The goal of this task is to produce a clear implementation-ready specification that can later be used by Claude Code to build the application incrementally.

# Project overview

Build a private personal vocabulary-learning Progressive Web App.

The application is intended primarily for use on an iPhone as an installed PWA, but it must also work normally in a desktop browser.

The app is for storing vocabulary cards containing:

- a word or phrase;
- translation;
- example sentence;
- translation of the example sentence;
- personal audio recording;
- category;
- learning status;
- created and updated timestamps.

The application will be private and used only by one owner.

There must be no public registration form.

# Technology stack

Use the following stack.

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

The UI should be mobile-first and optimized for iPhone.

Avoid unnecessary UI frameworks unless there is a strong reason to add one.

## PWA

Use:

- `vite-plugin-pwa`
- Web App Manifest
- Service Worker / Workbox
- standalone display mode
- installable PWA behavior
- offline-capable application shell

The production application will eventually be hosted as static files on GitHub Pages.

Take the GitHub Pages base path into account when configuring Vite and PWA assets.

## Local offline storage

Use:

- IndexedDB
- Dexie.js

IndexedDB should serve as the local cache and offline storage layer.

The app should use an offline-first approach where practical.

Cards should remain readable when offline if they have already been synchronized locally.

New or edited records should be capable of being marked for later synchronization when the network becomes available.

Design the data layer so cloud synchronization logic remains isolated from the UI.

## Cloud backend

Use Supabase Free tier.

Services:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage

The frontend communicates directly with Supabase using:

`@supabase/supabase-js`

Do not create a separate Express, NestJS, Node API, VPS backend, or server-side API for the MVP.

## Authentication

Authentication must use Supabase Auth.

Requirements:

- Login page with email/login and password.
- No registration page.
- No public account creation flow.
- No "Sign up" button.
- Only a manually created owner account should exist.
- The owner account can be created manually from the Supabase dashboard or another administrative/manual method.
- The application itself must never expose public registration.

The frontend must never contain the Supabase service-role key.

Only the public/publishable Supabase key may be exposed to the frontend.

Use Row Level Security.

All vocabulary data and audio files must only be accessible to the authenticated owner.

## Audio

Use browser APIs such as:

- MediaRecorder API
- getUserMedia

The user must be able to record their own pronunciation/audio directly inside the application.

Store finalized audio recordings in Supabase Storage.

Use a private Storage bucket.

Suggested structure:

`audio/<user_id>/<card_id>/<filename>`

Design the solution so locally recorded audio may temporarily exist offline before synchronization if required.

# Core domain model

The main entity is a vocabulary card.

Each card should contain at least:

- `id`
- `user_id`
- `title`
- `translation`
- `example_sentence`
- `example_sentence_translation`
- `category_id`
- `status`
- `audio_path`
- `created_at`
- `updated_at`
- optional `learned_at`

The `title` is the main word or phrase being learned.

Examples:

- `abandon`
- `take into account`
- `burden of proof`

The title is a standard text string.

It must also act as the clickable link to the card detail page when displayed in lists.

## Card status

A vocabulary card has one of two learning statuses:

- `learning`
- `learned`

Users must be able to move cards between these states.

The application should conceptually provide two collections/folders:

- Learning
- Learned

Do not physically duplicate or move records between tables.

Represent the state through the `status` field.

When a card becomes learned, store `learned_at`.

If moved back to learning, define a sensible behavior for `learned_at` and document it in the specification.

# Categories

Cards can optionally belong to a category.

Examples:

- Law
- Food
- Work
- Travel
- Technology
- Finance
- Health
- Education
- Everyday
- Other

Create a default set of popular categories.

The exact initial list should be proposed in `SPEC.md`, but it should remain small, useful, and editable.

Requirements:

- Category is optional when creating or editing a card.
- If the user does not choose a category, the card automatically belongs to `Other`.
- The user can create new custom categories.
- Categories should be stored in their own table/entity.
- Categories should belong to the current user unless there is a better documented architecture for built-in defaults.
- The `Other` category must always exist.
- Prevent accidental deletion of `Other`, or define another safe behavior.
- Consider how category deletion should behave when cards are assigned to it.
- Cards from a deleted category should preferably move to `Other`.
- Category names should be unique per user.
- Categories should support filtering.

Document the category model and category lifecycle clearly.

# Application pages

The application should contain several pages.

## 1. Login page

Route suggestion:

`/login`

Contains:

- login/email field;
- password field;
- login button;
- validation;
- authentication error state.

No registration functionality.

If an authenticated user opens `/login`, redirect them to the card list.

Unauthenticated users should not be able to access protected application pages.

## 2. Card list page

Route suggestion:

`/cards`

This is the main page after login.

Display vocabulary cards from newest to oldest by default:

`created_at DESC`

Requirements:

- 20 cards per page/request.
- Provide a `Load more` button.
- Initial request loads the first 20 cards.
- `Load more` appends the next 20 records to the existing list.
- Do not replace the existing list when loading more.
- Hide or disable `Load more` when no additional records exist.
- Provide proper loading, empty, and error states.

Each list item should show useful compact information, at minimum:

- title;
- category;
- learning status;
- optionally translation;
- optionally created date if useful.

The title must be clickable and navigate to the card detail page.

Example:

`abandon`

should link to:

`/cards/<card-id>`

The design must remain compact and easy to scan on iPhone.

## Filtering/navigation menu

The card list page must have a dropdown/menu that allows navigation/filtering by:

- all cards;
- Learning;
- Learned;
- individual category.

Examples:

- All
- Learning
- Learned
- Law
- Food
- Travel
- Other
- custom categories

The menu must be usable comfortably on mobile.

Define whether this filtering is represented in:

- query parameters;
- route parameters;
- or another clean URL strategy.

Prefer URLs that preserve filter state and can be bookmarked.

Examples could be:

`/cards?status=learning`

`/cards?category=law`

but choose the cleanest architecture and document it.

Pagination / `Load more` must work correctly together with active filters.

## 3. Card detail page

Route:

`/cards/:id`

The card detail page is used for focused reading and listening.

Display:

- word or phrase/title;
- translation;
- example sentence;
- example sentence translation;
- category;
- learning status;
- audio player;
- relevant metadata if useful.

The user should be able to play the stored audio recording.

Provide navigation between adjacent cards from the current list/filter context.

There should be:

- previous card navigation;
- next card navigation.

Each navigation control should contain:

- arrow icon;
- title of previous/next vocabulary word.

Example:

`← evidence`

and

`contract →`

The previous/next behavior must be based on the same ordering/filter context from which the user entered the card.

For example:

If the user is browsing:

`Learning + Law`

then previous/next navigation should remain inside:

`Learning + Law`

rather than navigating through all cards.

Define a robust way to preserve this context, preferably via URL/query state rather than hidden global state.

If there is no previous or next card, hide or disable the corresponding control.

## 4. Create card page

Route suggestion:

`/cards/new`

Fields:

- title — required;
- translation;
- example sentence;
- example sentence translation;
- category — optional;
- audio recording — optional or required depending on the final recommended UX;
- status — default should be `learning`.

If category is empty:

automatically assign `Other`.

The user must be able to:

- start audio recording;
- stop recording;
- preview recorded audio;
- discard and re-record audio;
- save the card.

Define appropriate validation.

The title is required.

Avoid unnecessary required fields.

## 5. Edit card page

Route suggestion:

`/cards/:id/edit`

Allow editing:

- title;
- translation;
- example sentence;
- example sentence translation;
- category;
- learning status;
- audio.

Allow replacing the existing audio recording.

Define whether old replaced audio files should be deleted from Supabase Storage.

Prefer cleanup of obsolete files when safely possible.

## 6. Category management page

Add a simple page or management UI for categories.

Possible route:

`/categories`

Features:

- list existing categories;
- create custom category;
- rename custom category;
- delete category;
- show number of cards in category if practical.

Deletion behavior:

cards should move to `Other`.

Protect the `Other` category from deletion.

Decide how built-in categories differ from user-created categories and document the behavior.

# Suggested database model

Design the exact schema in `SPEC.md`.

At minimum include:

## `vocabulary_cards`

Potential fields:

- `id uuid primary key`
- `user_id uuid`
- `title text not null`
- `translation text`
- `example_sentence text`
- `example_sentence_translation text`
- `category_id uuid`
- `status`
- `audio_path text`
- `created_at timestamptz`
- `updated_at timestamptz`
- `learned_at timestamptz`

Prefer a PostgreSQL enum or constrained text for:

`learning | learned`

but evaluate the trade-offs and document the decision.

## `categories`

Potential fields:

- `id uuid primary key`
- `user_id uuid`
- `name text`
- `slug text`
- `is_system boolean`
- `created_at`
- `updated_at`

Add appropriate uniqueness constraints.

Design foreign-key behavior carefully.

For category deletion, cards should end up in `Other`.

If database-level FK behavior cannot automatically map them specifically to `Other`, define the application/service transaction needed to achieve this safely.

# Default categories

Propose and seed a useful initial list.

For example:

- Other
- Everyday
- Work
- Law
- Food
- Travel
- Technology
- Finance
- Health
- Education

The exact list can be adjusted if a better compact default set is proposed.

The categories must be created for the owner account as part of the initial setup/seed process.

Document how category seeding works.

# Search

Plan support for searching cards by:

- title;
- translation;
- example sentence.

Search may be MVP or immediately-after-MVP, but the schema and architecture should not make it difficult to add.

If reasonable, include it in the MVP specification.

# Sorting

Default sorting:

newest first.

`created_at DESC`

Consider future support for:

- oldest first;
- alphabetical;
- recently updated.

Do not over-engineer this in the first implementation.

# State and architecture

Keep architecture simple.

Prefer something along these lines:

`pages/components`
→ `domain/services`
→ `repositories/data layer`
→ `IndexedDB + Supabase`

Do not make React components communicate directly with Supabase everywhere.

Create a clean data-access layer.

Suggested conceptual layers:

- UI / pages
- hooks
- application services
- repository layer
- local IndexedDB repository
- Supabase repository
- sync service

Avoid enterprise-level overengineering.

The project should remain easy for one developer to understand.

# Offline-first behavior

Design and document an offline-first strategy.

At minimum:

- previously downloaded cards should be readable offline;
- IndexedDB acts as local cache;
- application shell works offline;
- changes can be stored locally;
- synchronization happens when connectivity returns.

For MVP, synchronization may remain relatively simple.

Document conflict behavior.

Since this application is intended primarily for a single user, use a pragmatic strategy such as:

`last-write-wins`

based on `updated_at`, unless there is a clearly better simple approach.

Explain this in the specification.

# PWA behavior

The installed application should:

- have an application icon;
- use standalone mode;
- open without normal Safari browser chrome when launched from the Home Screen;
- support portrait/mobile-first use;
- cache the application shell;
- remain usable for locally cached content when offline.

Include all required PWA assets and manifest properties.

# Routing

Use React Router unless there is a better lightweight solution.

Suggested routes:

`/login`

`/cards`

`/cards/new`

`/cards/:id`

`/cards/:id/edit`

`/categories`

Optionally:

`/settings`

Filters should preferably be query parameters.

Examples:

`/cards?status=learning`

`/cards?status=learned`

`/cards?category=law`

`/cards?status=learning&category=law`

Preserve filter/query context when opening a card so previous/next navigation remains meaningful.

# UI / UX

The design should be:

- minimal;
- clean;
- fast;
- mobile-first;
- easy to use one-handed on iPhone;
- comfortable for reading vocabulary;
- not visually overloaded.

Cards in list view should be compact.

The card detail page should prioritize:

1. word/phrase;
2. translation;
3. example sentence;
4. sentence translation;
5. audio.

Important actions should have large enough touch targets.

Use semantic HTML and basic accessibility practices.

# Loading and empty states

Every data-driven screen should handle:

- initial loading;
- load-more loading;
- empty state;
- server error;
- offline state where relevant.

Examples:

`No learning cards yet.`

`No cards in this category.`

Avoid blank screens.

# Security

The application is private.

Requirements:

- all protected tables use RLS;
- all queries are restricted by authenticated user;
- Storage bucket is private;
- Storage policies restrict paths by user ID;
- no service role secret in frontend;
- no public signup;
- environment variables use `VITE_` only for public browser-safe configuration.

Document all required RLS policies in `SPEC.md`.

Include example SQL where useful.

# Local development

Development should run locally using Docker Compose.

Use Node 24 LTS.

A typical setup:

Docker container
→ Vite development server
→ port 5173

The frontend source directory should be mounted into the container for local development.

Do not run the production application through Docker in GitHub Pages.

Docker is for local development only.

Cloud Supabase should be used during normal development.

Do not require running a complete local Supabase stack unless specifically needed later.

# Environment variables

Expected variables:

`VITE_SUPABASE_URL`

`VITE_SUPABASE_PUBLISHABLE_KEY`

Do not include real credentials in the repository.

Provide:

`.env.example`

Do not commit:

`.env`

# Production deployment

Target:

GitHub Pages.

Workflow:

source code in `main`
→ GitHub Actions
→ `npm ci`
→ `npm run build`
→ `dist`
→ GitHub Pages deployment

Do not commit generated `dist` into the main source branch unless there is a strong reason.

Use GitHub Actions for deployment.

Make sure Vite `base` works with a repository subpath such as:

`https://username.github.io/vocabulary/`

PWA manifest, service worker, icons, routing, and assets must work correctly with the Pages base path.

Document SPA routing limitations on GitHub Pages and propose a reliable strategy.

# Testing

Propose a pragmatic testing strategy.

Prefer:

- Vitest for unit tests;
- React Testing Library for important component behavior;
- optional Playwright for a small number of critical end-to-end flows.

Critical flows worth testing:

- login;
- load card list;
- create card;
- category defaults to Other;
- change status Learning → Learned;
- filtering;
- load more pagination;
- previous/next navigation;
- audio recording logic where browser APIs can reasonably be mocked;
- offline cache/sync logic.

Do not aim for unnecessary 100% coverage.

# Code quality

Use:

- ESLint
- Prettier
- strict TypeScript where practical

Avoid:

- `any` unless absolutely justified;
- huge components;
- direct Supabase calls scattered through components;
- duplicated API logic;
- unnecessary global state.

Choose a simple approach to state management.

React hooks/context may be enough.

Do not add Redux or another large state-management library unless the specification identifies a real need.

# Important project principles

This is a personal application.

Optimize for:

1. simplicity;
2. reliability;
3. mobile UX;
4. easy maintenance;
5. low/no operating cost.

Do not design it like a large SaaS platform.

Do not introduce:

- microservices;
- separate backend API;
- Kubernetes;
- Redis;
- message queues;
- complex CQRS patterns;
- unnecessary cloud services.

# SPEC.md requirements

`SPEC.md` should be detailed enough that another Claude Code session could implement the project from it without having to rediscover product requirements.

Organize `SPEC.md` into sections such as:

1. Product overview
2. Goals
3. Non-goals
4. User model
5. Functional requirements
6. Pages and navigation
7. Vocabulary card behavior
8. Categories
9. Authentication
10. Audio recording
11. Filtering/search/sorting
12. Pagination
13. Previous/next navigation behavior
14. Offline-first behavior
15. Synchronization strategy
16. Data model
17. Supabase schema
18. RLS policies
19. Storage architecture
20. Frontend architecture
21. Routing
22. PWA requirements
23. Docker development environment
24. GitHub Pages deployment
25. Error/loading/empty states
26. Security
27. Testing
28. MVP scope
29. Future improvements
30. Acceptance criteria

Include concrete acceptance criteria.

Example:

Given a logged-in user with 35 cards,
when `/cards` opens,
then the first 20 newest cards are displayed.

When `Load more` is pressed,
the next 15 are appended.

When a user creates a card without selecting a category,
the card is assigned to `Other`.

When a user is viewing cards filtered by `Law + Learning`,
opens a card,
and presses Next,
the next card must belong to the same `Law + Learning` context.

Create acceptance criteria for all critical flows.

# CLAUDE.md requirements

Create a concise but useful `CLAUDE.md`.

It should tell future Claude Code sessions:

- what this project is;
- where `SPEC.md` lives;
- that `SPEC.md` is the source of truth for product behavior;
- required technology stack;
- project architecture;
- directory conventions;
- how data access should be implemented;
- security rules;
- Supabase rules;
- IndexedDB/Dexie rules;
- offline-first philosophy;
- Docker development commands;
- expected build/test/lint commands;
- GitHub Pages constraints;
- rules around dependencies;
- coding conventions;
- testing expectations;
- how migrations should be handled;
- how to update documentation when behavior changes.

Also include rules such as:

- Read `SPEC.md` before implementing features.
- Do not silently change product behavior defined in `SPEC.md`.
- If implementation requires a product decision not covered in `SPEC.md`, document the decision before implementing it.
- Never expose Supabase service-role credentials.
- Never disable RLS as a shortcut.
- Never add public signup.
- Never bypass the repository/data-access layer by scattering Supabase calls through UI components.
- Keep mobile/iPhone UX as the primary UX.
- Avoid unnecessary dependencies.
- Prefer the simplest correct implementation.
- Before completing a feature, run relevant tests, lint, typecheck, and build.
- Keep `SPEC.md` synchronized with intentional product changes.

# Initial project output

For this task, create only:

- `SPEC.md`
- `CLAUDE.md`

Do not scaffold React yet.

Do not create database migrations yet.

Do not create Docker files yet.

Do not implement Supabase integration yet.

Do not create application code yet.

You may describe the proposed folder structure inside the specification.

Before writing the files, reason through ambiguous parts of the requirements and make pragmatic decisions.

Where a product or technical decision is not explicitly specified, choose the simplest option appropriate for a single-user personal application and document that decision clearly.

The final `SPEC.md` should be implementation-ready rather than a loose brainstorm.

---

## Owner's additional instructions (same session, translated from Ukrainian)

- Act as a senior software developer; use best practices only.
- Create `CLAUDE.md` describing the project, a `docs/` folder with the conventions to follow in every session, and a `work/` folder with `active/` (current spec) and `archive/` (completed specs).
- In `work/active/` create a folder for this spec with `plan.md`; each new session takes the next step from the plan until completion. For every step, create a step plan file in the same folder and mark steps as done.
- Ask the owner whenever their help or action is required, and wait.
- Answers given during planning: docs in English; GitHub repo name `gapper`; initialize git and make an initial commit.
