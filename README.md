# Monorepo Overview

A monorepo containing four packages:

- `packages/client`: A Vite React application
- `packages/server`: Backend server
- `packages/domain`: Shared domain logic consumed by both client and server
- `packages/database`: Database schema and migrations

## Prerequisites and Setup

### Using Nix

Using Nix ensures that all developers have the exact same development environment, eliminating "it works on my machine" problems.

#### Why Nix?

Nix provides several benefits for development:

1. **Reproducible environments**: Everyone on the team gets exactly the same development environment with the same versions of all tools.

2. **Declarative configuration**: All dependencies are explicitly declared in the `flake.nix` file.

3. **Isolation**: The development environment is isolated from your system, preventing conflicts with globally installed packages.

4. **Cross-platform**: Works the same way on macOS, Linux, and WSL on Windows.

5. **Simpler than containerization**: Unlike Docker-based setups that require port mapping and container networking, Nix environments run natively while maintaining isolation. This eliminates the need for volume mounts and container-to-host port exposure, while preserving direct filesystem access to your source code and providing better performance through native execution.

#### Setup Steps

1. Install Nix:

   ```bash
   # For macOS and Linux
   sh <(curl -L https://nixos.org/nix/install) --daemon

   # For more installation options, visit:
   # https://nixos.org/download.html
   ```

2. Enable Flakes (if not already enabled):

   ```bash
   # Add this to ~/.config/nix/nix.conf or /etc/nix/nix.conf
   experimental-features = nix-command flakes
   ```

3. Enter the development environment:

   ```bash
   # From the project root
   nix develop
   ```

   This will automatically set up all required tools with the correct versions.

4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Start the Jaeger instance for local telemetry:

   ```bash
   docker-compose up -d
   ```

   You can view the Jaeger UI at: http://localhost:16686/search

6. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

   Update any values in the `.env` file as needed.

## Development

### Running Packages in Development Mode

You can run packages in development mode directly from the root directory using the provided script aliases:

```bash
# Start the client
pnpm dev:client

# Start the server
pnpm dev:server
```

These commands use PNPM's filter feature behind the scenes, so there's no need to change directories.

For the best development experience, run the server and client in separate terminal windows:

```bash
# In terminal 1
nix develop
pnpm dev:server

# In terminal 2
nix develop
pnpm dev:client
```

## Operations

### Building Packages

**Building All Packages**

To build all packages in the monorepo, run the following command from the root directory:

```sh
pnpm build
```

**Building a Specific Package**

To build a specific package, use the `--filter` option:

```sh
pnpm --filter <package-name> build
```

For example:

```sh
pnpm --filter client build
```

### Checking All Packages

To check all packages in the monorepo, run the following command:

```sh
pnpm check:all
```

This will run `pnpm lint`, `pnpm test`, and `pnpm check` for all packages.
