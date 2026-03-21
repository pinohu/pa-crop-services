#!/bin/bash
# PA CROP Services — OpenClaw One-Command Deployer
# Run: curl -fsSL [url] | bash
# Or: bash deploy.sh

set -e
echo "🦞 PA CROP Services — OpenClaw Deployment"
echo ""

# Check Node.js
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]; then
  echo "[!] Node.js 22+ required. Installing..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "Please install Node.js 22+ manually: https://nodejs.org"
    exit 1
  fi
fi
echo "[✓] Node.js $(node -v)"

# Install OpenClaw
if ! command -v openclaw &>/dev/null; then
  echo "[*] Installing OpenClaw..."
  npm install -g openclaw@latest
fi
echo "[✓] OpenClaw $(openclaw --version 2>/dev/null | head -1)"

# Deploy config and workspaces
OCDIR="$HOME/.openclaw"
echo "[*] Deploying config to $OCDIR..."

# Backup existing config
if [ -f "$OCDIR/openclaw.json" ]; then
  cp "$OCDIR/openclaw.json" "$OCDIR/openclaw.json.backup.$(date +%s)"
  echo "[*] Backed up existing config"
fi

# Create directories
mkdir -p "$OCDIR/workspaces/crop-ceo"
mkdir -p "$OCDIR/workspaces/crop-developer"
mkdir -p "$OCDIR/workspaces/crop-marketer"
mkdir -p "$OCDIR/workspaces/crop-ops"
mkdir -p "$OCDIR/agents/crop-ceo/sessions"
mkdir -p "$OCDIR/agents/crop-developer/sessions"
mkdir -p "$OCDIR/agents/crop-marketer/sessions"
mkdir -p "$OCDIR/agents/crop-ops/sessions"

# Write config (update workspace paths to use $HOME)
cat > "$OCDIR/openclaw.json" << OCJSON
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6"
      }
    },
    "list": [
      {
        "id": "crop-ceo",
        "name": "CROP CEO",
        "model": {"primary": "anthropic/claude-sonnet-4-6"},
        "workspace": "$OCDIR/workspaces/crop-ceo"
      },
      {
        "id": "crop-developer",
        "name": "CROP Developer",
        "model": {"primary": "anthropic/claude-sonnet-4-6"},
        "workspace": "$OCDIR/workspaces/crop-developer"
      },
      {
        "id": "crop-marketer",
        "name": "CROP Marketer",
        "model": {"primary": "anthropic/claude-sonnet-4-6"},
        "workspace": "$OCDIR/workspaces/crop-marketer"
      },
      {
        "id": "crop-ops",
        "name": "CROP Operations",
        "model": {"primary": "anthropic/claude-sonnet-4-6"},
        "workspace": "$OCDIR/workspaces/crop-ops"
      }
    ]
  },
  "bindings": [
    {"agentId": "crop-ceo", "match": {"channel": "telegram"}},
    {"agentId": "crop-developer", "match": {"channel": "cli"}}
  ],
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback"
  }
}
OCJSON

# Write SOUL.md files
cat > "$OCDIR/workspaces/crop-ceo/SOUL.md" << 'SOUL'
# CROP CEO Agent
You are the CEO agent for PA CROP Services (PA Registered Office Services, LLC). You coordinate all other agents, track progress against the execution plan in your workspace, and make strategic decisions. Entity: PA Registered Office Services, LLC. Domain: pacropservices.com.
SOUL

cat > "$OCDIR/workspaces/crop-developer/SOUL.md" << 'SOUL'
# CROP Developer Agent
You are the developer agent for PA CROP Services. You write code, deploy websites, build n8n workflows. Workspace has the full pa-crop-services repo. Stack: Vercel, Stripe, SuiteDash, n8n (n8n.audreysplace.place).
SOUL

cat > "$OCDIR/workspaces/crop-marketer/SOUL.md" << 'SOUL'
# CROP Marketer Agent
You are the marketing agent for PA CROP Services. Write SEO articles, social posts, email campaigns. Key angle: 2027 dissolution deadline. Pricing: Starter $79/yr, Professional $179/yr, Premium $299/yr.
SOUL

cat > "$OCDIR/workspaces/crop-ops/SOUL.md" << 'SOUL'
# CROP Operations Agent
You are the operations agent for PA CROP Services. Monitor n8n workflows, track metrics, manage SuiteDash config. Workspace has the Operations Bible with every SOP and email template.
SOUL

# Clone the repo
if [ ! -d "$OCDIR/workspaces/crop-developer/pa-crop-services" ]; then
  echo "[*] Cloning PA CROP repo..."
  cd "$OCDIR/workspaces/crop-developer"
  git clone https://github.com/pinohu/pa-crop-services.git 2>/dev/null || echo "[!] Clone failed — repo may be private. Clone manually."
fi

# Copy docs to workspaces
REPO="$OCDIR/workspaces/crop-developer/pa-crop-services"
if [ -d "$REPO" ]; then
  cp "$REPO/PA-CROP-Execution-Plan.md" "$OCDIR/workspaces/crop-ceo/" 2>/dev/null
  cp "$REPO/PA-CROP-AI-Agent-Orchestration-Guide.md" "$OCDIR/workspaces/crop-ceo/" 2>/dev/null
  cp "$REPO/operations/PA-CROP-Operations-Bible.md" "$OCDIR/workspaces/crop-ops/" 2>/dev/null
  cp "$REPO/marketing/seo-articles/PA-CROP-SEO-Articles.md" "$OCDIR/workspaces/crop-marketer/" 2>/dev/null
fi

# Set permissions
chmod 700 "$OCDIR"
chmod 600 "$OCDIR/openclaw.json"

echo ""
echo "============================================"
echo "  OpenClaw deployed for PA CROP Services"
echo "============================================"
echo ""
echo "Agents: crop-ceo, crop-developer, crop-marketer, crop-ops"
echo "Config: $OCDIR/openclaw.json"
echo ""
echo "NEXT STEPS:"
echo "  1. Set your Anthropic API key:"
echo "     export ANTHROPIC_API_KEY=sk-ant-your-key-here"
echo ""
echo "  2. Run doctor to verify:"
echo "     openclaw doctor"
echo ""
echo "  3. Start the gateway:"
echo "     openclaw gateway"
echo ""
echo "  4. Open Web UI: http://127.0.0.1:18789"
echo ""
echo "  5. (Optional) Connect Telegram:"
echo "     openclaw configure --section channels"
echo ""
