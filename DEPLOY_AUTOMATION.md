# Weggo Deploy Automation

This repo now includes an automated SSH deploy-key and server bootstrap flow for the `web@100.78.155.72` server.

## Files

- `scripts/setup-github-deploy-key.sh`
  - run this on the server to generate a dedicated GitHub deploy key
  - prints the public key you need to add to GitHub
- `scripts/setup-server.sh`
  - installs system dependencies
  - clones or updates the repo over SSH
  - writes `.env.production`
  - runs `npm install`, `npm run build`, and starts the app with `pm2`
- `scripts/bootstrap-remote-setup.sh`
  - local wrapper that copies the two scripts to the server and runs them remotely

## Step 1: Generate the server GitHub key

From your local machine:

```bash
./scripts/bootstrap-remote-setup.sh key
```

That prints a public key from the server. Add it to GitHub, then grant the key access to the repository you want the server to pull.

Use the Git SSH alias from the script output when you define the repo URL, for example:

```bash
git@github-weggo:OWNER/REPO.git
```

## Step 2: Run the full deploy

```bash
REPO_SSH_URL=git@github-weggo:OWNER/REPO.git \
MONGODB_URI='mongodb://localhost:27017/weggo' \
JWT_SECRET='replace-with-a-long-random-secret' \
NEXT_PUBLIC_SITE_URL='https://your-domain.com' \
./scripts/bootstrap-remote-setup.sh deploy
```

Optional environment variables are the same ones already documented in `.env.example`.

## Notes

- `setup-server.sh` supports `apt`, `pacman`, and `dnf`.
- The current target server is CachyOS, so the script will use the `pacman` branch there.
- If `.env.production` already exists on the server, it is kept by default.
- Set `FORCE_ENV=1` if you want to overwrite the env file during deploy.
