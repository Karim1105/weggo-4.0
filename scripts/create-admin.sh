#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  create-admin.sh — Create an admin user in the Weggo MongoDB
#
#  Works on Ubuntu, CachyOS, or any Linux with mongosh + openssl.
#  Passwords are bcrypt-hashed (cost 12) to match the User model.
#
#  Usage:
#    ./scripts/create-admin.sh
#    MONGODB_URI=mongodb://user:pass@host:27017/weggo ./scripts/create-admin.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

# ── colours ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

# ── dependency check ─────────────────────────────────────────
for cmd in mongosh node; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}Error:${NC} '$cmd' is required but not installed."
    case "$cmd" in
      mongosh) echo "  Install: https://www.mongodb.com/docs/mongodb-shell/install/" ;;
      node)    echo "  Install: https://nodejs.org/" ;;
    esac
    exit 1
  fi
done

# ── load .env.local or .env.production if no MONGODB_URI ─────
if [[ -z "${MONGODB_URI:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

  for envfile in "$PROJECT_ROOT/.env.production" "$PROJECT_ROOT/.env.local"; do
    if [[ -f "$envfile" ]]; then
      MONGODB_URI="$(grep -E '^MONGODB_URI=' "$envfile" | head -1 | cut -d '=' -f2-)"
      if [[ -n "$MONGODB_URI" ]]; then
        echo -e "${CYAN}Loaded MONGODB_URI from${NC} $envfile"
        break
      fi
    fi
  done
fi

MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/weggo}"
echo -e "${CYAN}Database:${NC} $MONGODB_URI"
echo ""

# ── collect credentials ──────────────────────────────────────
read -rp "$(echo -e "${YELLOW}Admin name:${NC} ")" ADMIN_NAME
if [[ -z "$ADMIN_NAME" ]]; then
  echo -e "${RED}Name cannot be empty.${NC}"
  exit 1
fi

read -rp "$(echo -e "${YELLOW}Admin email:${NC} ")" ADMIN_EMAIL
if [[ -z "$ADMIN_EMAIL" ]]; then
  echo -e "${RED}Email cannot be empty.${NC}"
  exit 1
fi

while true; do
  read -srp "$(echo -e "${YELLOW}Password (min 6 chars):${NC} ")" ADMIN_PASS
  echo ""
  if [[ ${#ADMIN_PASS} -lt 6 ]]; then
    echo -e "${RED}Password must be at least 6 characters.${NC}"
    continue
  fi
  read -srp "$(echo -e "${YELLOW}Confirm password:${NC} ")" ADMIN_PASS_CONFIRM
  echo ""
  if [[ "$ADMIN_PASS" != "$ADMIN_PASS_CONFIRM" ]]; then
    echo -e "${RED}Passwords do not match. Try again.${NC}"
    continue
  fi
  break
done

# ── hash the password with bcrypt (cost 12, matches User model) ─
HASHED_PASS="$(node -e "
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(process.argv[1], 12);
  process.stdout.write(hash);
" "$ADMIN_PASS")"

# ── insert into MongoDB ─────────────────────────────────────
echo ""
echo -e "${CYAN}Creating admin user...${NC}"

RESULT="$(mongosh "$MONGODB_URI" --quiet --eval "
  const existing = db.users.findOne({ email: '$(echo "$ADMIN_EMAIL" | tr '[:upper:]' '[:lower:]')' });
  if (existing) {
    if (existing.role === 'admin') {
      print('EXISTS_ADMIN');
    } else {
      db.users.updateOne(
        { _id: existing._id },
        {
          \$set: {
            name: '$ADMIN_NAME',
            password: '$HASHED_PASS',
            role: 'admin',
            isVerified: true,
            sellerVerified: true,
            banned: false
          },
          \$unset: {
            bannedAt: '',
            bannedReason: '',
            bannedBy: ''
          }
        }
      );
      print('PROMOTED');
    }
  } else {
    const now = new Date();
    db.users.insertOne({
      name: '$ADMIN_NAME',
      email: '$(echo "$ADMIN_EMAIL" | tr '[:upper:]' '[:lower:]')',
      password: '$HASHED_PASS',
      role: 'admin',
      isVerified: true,
      sellerVerified: true,
      averageRating: 0,
      ratingCount: 0,
      totalSales: 0,
      banned: false,
      blockedUsers: [],
      createdAt: now,
      updatedAt: now
    });
    print('CREATED');
  }
")"

# ── output result ────────────────────────────────────────────
case "$RESULT" in
  *CREATED*)
    echo -e "${GREEN}✓ Admin user created successfully${NC}"
    echo -e "  Name:  $ADMIN_NAME"
    echo -e "  Email: $ADMIN_EMAIL"
    ;;
  *PROMOTED*)
    echo -e "${GREEN}✓ Existing user promoted to admin${NC}"
    echo -e "  Name:  $ADMIN_NAME"
    echo -e "  Email: $ADMIN_EMAIL"
    ;;
  *EXISTS_ADMIN*)
    echo -e "${YELLOW}⚠ An admin with that email already exists. No changes made.${NC}"
    ;;
  *)
    echo -e "${RED}✗ Unexpected result:${NC}"
    echo "$RESULT"
    exit 1
    ;;
esac
