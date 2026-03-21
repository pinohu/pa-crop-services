#!/usr/bin/env bash
# ============================================================
# PA CROP Services — Dedicated Machine Setup
# ============================================================
# Run this on a fresh Ubuntu/Debian machine (or WSL2 on Windows)
# It installs EVERYTHING: OpenClaw, Mission Control, the website,
# n8n connection, Cursor rules, and all agent workspaces.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.sh | bash
#
# Or clone first and run:
#   git clone https://github.com/pinohu/pa-crop-services.git
#   cd pa-crop-services
#   chmod +x setup/install.sh
#   ./setup/install.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[CROP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }
header() { echo -e "\n${BLUE}════════════════════════════════════════${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}════════════════════════════════════════${NC}\n"; }

# ============================================================
header "PHASE 1: System Prerequisites"
# ============================================================

# Check OS
OS=$(uname -s)
log "Detected OS: $OS"

# Install Node.js 22+ if missing
if command -v node &> /dev/null; then
    NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -ge 22 ]; then
        log "Node.js $(node -v) ✓"
    else
        warn "Node.js $(node -v) is too old. Installing v22..."
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
else
    log "Installing Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install git if missing
if ! command -v git &> /dev/null; then
    log "Installing git..."
    sudo apt-get update -qq && sudo apt-get install -y git
fi
log "Git $(git --version | cut -d' ' -f3) ✓"

# Install Docker if missing (for Mission Control)
if ! command -v docker &> /dev/null; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    warn "Docker installed. You may need to log out and back in for group changes."
else
    log "Docker $(docker --version | cut -d' ' -f3 | tr -d ',') ✓"
fi

# Install pnpm if missing
if ! command -v pnpm &> /dev/null; then
    log "Installing pnpm..."
    npm install -g pnpm
fi

log "Node: $(node -v) | npm: $(npm -v) | pnpm: $(pnpm -v)"

# ============================================================
header "PHASE 2: Clone PA CROP Services Repository"
# ============================================================

CROP_HOME="$HOME/pa-crop-services"

if [ -d "$CROP_HOME" ]; then
    log "Repository already exists at $CROP_HOME. Pulling latest..."
    cd "$CROP_HOME"
    git pull origin main
else
    log "Cloning pinohu/pa-crop-services..."
    git clone https://github.com/pinohu/pa-crop-services.git "$CROP_HOME"
    cd "$CROP_HOME"
fi

log "Repository ready: $(git log --oneline -1)"
log "Files: $(git ls-files | wc -l)"

# ============================================================
header "PHASE 3: Install OpenClaw"
# ============================================================

if command -v openclaw &> /dev/null; then
    log "OpenClaw already installed: $(openclaw --version 2>/dev/null || echo 'version unknown')"
    warn "Skipping install. Run 'npm update -g openclaw@latest' to update."
else
    log "Installing OpenClaw globally..."
    npm install -g openclaw@latest
    log "OpenClaw installed: $(openclaw --version 2>/dev/null || echo 'checking...')"
fi

# ============================================================
header "PHASE 4: Configure OpenClaw Agent Workspaces"
# ============================================================

OPENCLAW_HOME="$HOME/.openclaw"
mkdir -p "$OPENCLAW_HOME/workspaces/crop-ceo"
mkdir -p "$OPENCLAW_HOME/workspaces/crop-developer"
mkdir -p "$OPENCLAW_HOME/workspaces/crop-marketer"
mkdir -p "$OPENCLAW_HOME/workspaces/crop-ops"

# Link the repo into the developer workspace
if [ ! -L "$OPENCLAW_HOME/workspaces/crop-developer/pa-crop-services" ] && [ ! -d "$OPENCLAW_HOME/workspaces/crop-developer/pa-crop-services" ]; then
    ln -s "$CROP_HOME" "$OPENCLAW_HOME/workspaces/crop-developer/pa-crop-services"
    log "Linked repo to developer workspace"
fi

# Copy key docs to agent workspaces
cp -u "$CROP_HOME/PA-CROP-Execution-Plan.md" "$OPENCLAW_HOME/workspaces/crop-ceo/" 2>/dev/null || true
cp -u "$CROP_HOME/PA-CROP-AI-Agent-Orchestration-Guide.md" "$OPENCLAW_HOME/workspaces/crop-ceo/" 2>/dev/null || true
cp -u "$CROP_HOME/operations/PA-CROP-Operations-Bible.md" "$OPENCLAW_HOME/workspaces/crop-ops/" 2>/dev/null || true
cp -u "$CROP_HOME/marketing/seo-articles/PA-CROP-SEO-Articles.md" "$OPENCLAW_HOME/workspaces/crop-marketer/" 2>/dev/null || true

log "Agent workspaces populated ✓"

# ============================================================
header "PHASE 5: Merge PA CROP Agents into OpenClaw Config"
# ============================================================

OPENCLAW_CONFIG="$OPENCLAW_HOME/openclaw.json"
CROP_AGENTS="$CROP_HOME/openclaw/openclaw-agents.json"

if [ -f "$OPENCLAW_CONFIG" ]; then
    log "Existing openclaw.json found. Merging CROP agents..."
    cp "$OPENCLAW_CONFIG" "$OPENCLAW_CONFIG.backup.$(date +%s)"
    
    python3 -c "
import json, os

config_path = os.path.expanduser('$OPENCLAW_CONFIG')
agents_path = '$CROP_AGENTS'

with open(config_path) as f:
    config = json.load(f)
with open(agents_path) as f:
    crop = json.load(f)

if 'agents' not in config:
    config['agents'] = {'list': []}
if 'list' not in config.get('agents', {}):
    config['agents']['list'] = []

existing_ids = {a.get('id') for a in config['agents']['list']}
added = 0
for agent in crop['agents']['list']:
    if agent['id'] not in existing_ids:
        config['agents']['list'].append(agent)
        added += 1

config['agents']['defaults'] = crop['agents'].get('defaults', {})

if 'bindings' not in config:
    config['bindings'] = []
for b in crop.get('bindings', []):
    if b not in config['bindings']:
        config['bindings'].append(b)

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print(f'Merged: {added} new agents. Total: {len(config[\"agents\"][\"list\"])} agents.')
" 2>/dev/null || warn "Python3 not available. Copy openclaw/openclaw-agents.json manually."
else
    log "No existing openclaw.json. Copying CROP config..."
    cp "$CROP_AGENTS" "$OPENCLAW_CONFIG"
    log "Created openclaw.json with 4 CROP agents"
fi

# ============================================================
header "PHASE 6: Install Mission Control Dashboard"
# ============================================================

MC_HOME="$HOME/openclaw-mission-control"

if [ -d "$MC_HOME" ]; then
    log "Mission Control already cloned. Pulling latest..."
    cd "$MC_HOME"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
else
    log "Cloning Mission Control..."
    git clone https://github.com/abhi1693/openclaw-mission-control.git "$MC_HOME" 2>/dev/null || {
        git clone https://github.com/crshdn/mission-control.git "$MC_HOME" 2>/dev/null || {
            warn "Could not clone Mission Control. Skipping."
            MC_HOME=""
        }
    }
fi

if [ -n "$MC_HOME" ] && [ -d "$MC_HOME" ]; then
    cd "$MC_HOME"
    if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
        log "Starting Mission Control via Docker..."
        docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || {
            warn "Docker Compose failed. Installing locally instead..."
            npm install
            cp .env.example .env.local 2>/dev/null || true
            log "Run 'cd $MC_HOME && npm run dev' to start Mission Control"
        }
    else
        log "Installing Mission Control locally..."
        npm install
        cp .env.example .env.local 2>/dev/null || true
        log "Run 'cd $MC_HOME && npm run dev' to start Mission Control"
    fi
fi

# ============================================================
header "PHASE 7: Install Vercel CLI"
# ============================================================

if command -v vercel &> /dev/null; then
    log "Vercel CLI already installed ✓"
else
    log "Installing Vercel CLI..."
    npm install -g vercel
fi

# ============================================================
header "PHASE 8: Install Claude Code CLI"
# ============================================================

if command -v claude &> /dev/null || command -v claude-code &> /dev/null; then
    log "Claude Code already installed ✓"
else
    log "Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code 2>/dev/null || warn "Claude Code install failed. Install manually: npm install -g @anthropic-ai/claude-code"
fi

# ============================================================
header "PHASE 9: Deploy Power Tools (Docker Stack)"
# ============================================================

if command -v docker &> /dev/null; then
    cd "$CROP_HOME"
    
    # Create consume directory for Paperless-ngx
    mkdir -p paperless/consume
    
    log "Starting Docker power tool stack..."
    log "  → Paperless-ngx (document management + OCR)"
    log "  → Uptime Kuma (monitoring)"
    log "  → Stirling PDF (PDF toolkit)"
    
    docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || {
        warn "Docker Compose failed. Try manually: cd $CROP_HOME && docker compose up -d"
    }
    
    # Wait for services to start
    sleep 5
    
    # Check which services are running
    if docker ps --filter "name=crop-paperless" --format "{{.Names}}" | grep -q "crop-paperless"; then
        log "Paperless-ngx running at http://localhost:8000 ✓"
    else
        warn "Paperless-ngx may still be starting. Check: docker logs crop-paperless"
    fi
    
    if docker ps --filter "name=crop-uptime-kuma" --format "{{.Names}}" | grep -q "crop-uptime-kuma"; then
        log "Uptime Kuma running at http://localhost:3001 ✓"
    else
        warn "Uptime Kuma may still be starting. Check: docker logs crop-uptime-kuma"
    fi
    
    if docker ps --filter "name=crop-stirling-pdf" --format "{{.Names}}" | grep -q "crop-stirling-pdf"; then
        log "Stirling PDF running at http://localhost:8080 ✓"
    else
        warn "Stirling PDF may still be starting. Check: docker logs crop-stirling-pdf"
    fi
else
    warn "Docker not available. Power tools not installed."
    warn "Install Docker first, then run: cd $CROP_HOME && docker compose up -d"
fi

# ============================================================
header "SETUP COMPLETE"
# ============================================================

cd "$CROP_HOME"

echo ""
log "PA CROP Services is installed at: $CROP_HOME"
log "OpenClaw config at: $OPENCLAW_HOME/openclaw.json"
log "Mission Control at: $MC_HOME"
echo ""
log "Power Tools:"
log "  Paperless-ngx  → http://localhost:8000"
log "  Uptime Kuma    → http://localhost:3001"
log "  Stirling PDF   → http://localhost:8080"
echo ""
echo -e "${GREEN}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${GREEN}│              NEXT STEPS (do these manually)             │${NC}"
echo -e "${GREEN}├─────────────────────────────────────────────────────────┤${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  1. Run OpenClaw onboarding:                           │${NC}"
echo -e "${GREEN}│     openclaw onboard --install-daemon                  │${NC}"
echo -e "${GREEN}│     → Select Anthropic, paste API key, pick Telegram   │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  2. Start Mission Control:                             │${NC}"
echo -e "${GREEN}│     cd ~/openclaw-mission-control && npm run dev       │${NC}"
echo -e "${GREEN}│     → Open http://localhost:4000                       │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  3. Set up Paperless-ngx admin:                        │${NC}"
echo -e "${GREEN}│     Open http://localhost:8000                         │${NC}"
echo -e "${GREEN}│     → Create admin account on first login              │${NC}"
echo -e "${GREEN}│     → Settings → Webhooks → Add n8n URL               │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  4. Set up Uptime Kuma monitors:                       │${NC}"
echo -e "${GREEN}│     Open http://localhost:3001                         │${NC}"
echo -e "${GREEN}│     → Add: pacropservices.com, n8n, SuiteDash portal  │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  5. Deploy the website:                                │${NC}"
echo -e "${GREEN}│     cd ~/pa-crop-services && vercel --prod             │${NC}"
echo -e "${GREEN}│     → Connect pacropservices.com domain in Vercel      │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  6. Replace placeholders in public/*.html:             │${NC}"
echo -e "${GREEN}│     STRIPE_STARTER_LINK / PROFESSIONAL / PREMIUM      │${NC}"
echo -e "${GREEN}│     BUSINESS_PHONE                                     │${NC}"
echo -e "${GREEN}│     (Analytics already set to Plausible — no GA)       │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}│  7. Activate n8n workflows:                            │${NC}"
echo -e "${GREEN}│     Open https://n8n.audreysplace.place                │${NC}"
echo -e "${GREEN}│     → Add SMTP creds → Activate all CROP workflows    │${NC}"
echo -e "${GREEN}│     → Includes: onboarding, reminders, dunning,       │${NC}"
echo -e "${GREEN}│       Paperless doc router, DOS entity checker         │${NC}"
echo -e "${GREEN}│                                                         │${NC}"
echo -e "${GREEN}└─────────────────────────────────────────────────────────┘${NC}"
echo ""
echo -e "Run ${YELLOW}openclaw onboard --install-daemon${NC} now to start."
