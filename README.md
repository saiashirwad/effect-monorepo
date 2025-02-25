# Monorepo Overview

A monorepo containing four packages:

- `packages/client`: A Vite React application
- `packages/server`: Backend server
- `packages/domain`: Shared domain logic consumed by both client and server
- `packages/database`: Database schema and migrations

## Prerequisites

1. Enable Corepack for PNPM:

```bash
corepack enable
corepack enable pnpm@10.3.0
```

2. Install the correct Node.js version using NVM:

```bash
nvm use
```

3. Install Docker for local telemetry

## Installation

```bash
pnpm install
```

## Configuration

1. Copy the example environment file to the actual environment file and update any values as needed:

```bash
cp .env.example .env
```

## Development

1. Start the Jaeger instance for local telemetry:

```bash
docker-compose up -d
```

You can view the Jaeger UI at: http://localhost:16686/search

2. Start the server:

```bash
cd packages/server
pnpm dev
```

3. Start the client:

```bash
cd packages/client
pnpm dev
```

## Operations

**Checking All Packages**

To check all packages in the monorepo, run the following command:

```sh
pnpm check:all
```

This will run `pnpm lint`, `pnpm test`, and `pnpm check` for all packages.
