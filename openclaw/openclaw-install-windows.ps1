# PA CROP Services — OpenClaw Installation on Your Windows PC
# Run these commands in PowerShell (Admin) or Windows Terminal

# ============================================================
# STEP 1: Prerequisites
# ============================================================

# Check Node.js version (need 22+)
node -v
# If not installed or below v22, install it:
# Go to https://nodejs.org — download the LTS version (v22+)
# OR use winget:
winget install OpenJS.NodeJS.LTS

# Check git
git --version
# If not installed:
winget install Git.Git

# Restart your terminal after installing Node/Git so PATH updates

# ============================================================
# STEP 2: Install OpenClaw
# ============================================================

npm install -g openclaw@latest

# Verify it installed
openclaw --version

# ============================================================
# STEP 3: Run the Onboarding Wizard
# ============================================================

openclaw onboard --install-daemon

# The wizard will ask you:
#
# 1. LLM Provider → Select "Anthropic"
#    Paste your Anthropic API key (starts with sk-ant-)
#    Model → Select "claude-sonnet-4-6" (fast + smart for agent work)
#
# 2. Skills → Select "No" for now (we'll add PA CROP skills after)
#
# 3. Hooks → Select "Skip for now"
#
# 4. Channels → Select "Telegram" if you want to talk to it from your phone
#    (You already have @pinohu_bot — you can connect it here)
#    OR select "Skip" and use the Web UI only
#
# 5. Daemon → Let it install the background service
#
# When it says "OpenClaw is online" → you're done with basic install

# ============================================================
# STEP 4: Verify Everything Works
# ============================================================

openclaw doctor
openclaw gateway status

# Open the Web UI in your browser:
# http://127.0.0.1:18789
# Copy the access token shown in terminal → paste into Web UI

# ============================================================
# STEP 5: Install Mission Control (the dashboard)
# ============================================================

# Option A: Docker (if you have Docker Desktop installed)
cd ~
git clone https://github.com/abhi1693/openclaw-mission-control.git
cd openclaw-mission-control
docker compose up -d
# Dashboard at: http://localhost:4000

# Option B: Local (if you don't have Docker)
cd ~
git clone https://github.com/abhi1693/openclaw-mission-control.git
cd openclaw-mission-control
npm install
copy .env.example .env.local
# Edit .env.local — set OPENCLAW_GATEWAY_URL=ws://localhost:18789
npm run dev
# Dashboard at: http://localhost:4000

# ============================================================
# STEP 6: Configure PA CROP Agents
# ============================================================

# Create workspace directories
mkdir -p "$HOME\.openclaw\workspaces\crop-ceo"
mkdir -p "$HOME\.openclaw\workspaces\crop-developer"
mkdir -p "$HOME\.openclaw\workspaces\crop-marketer"
mkdir -p "$HOME\.openclaw\workspaces\crop-ops"

# Clone the PA CROP repo into the developer workspace
cd "$HOME\.openclaw\workspaces\crop-developer"
git clone https://github.com/pinohu/pa-crop-services.git

# Copy key docs to agent workspaces
copy pa-crop-services\PA-CROP-Execution-Plan.md "$HOME\.openclaw\workspaces\crop-ceo\"
copy pa-crop-services\PA-CROP-AI-Agent-Orchestration-Guide.md "$HOME\.openclaw\workspaces\crop-ceo\"
copy pa-crop-services\operations\PA-CROP-Operations-Bible.md "$HOME\.openclaw\workspaces\crop-ops\"
copy pa-crop-services\marketing\seo-articles\PA-CROP-SEO-Articles.md "$HOME\.openclaw\workspaces\crop-marketer\"

# ============================================================
# STEP 7: Update openclaw.json with PA CROP agents
# ============================================================

# Open the config file in your editor:
# Location: ~/.openclaw/openclaw.json (or C:\Users\polyc\.openclaw\openclaw.json)
#
# Find the "agents" section and REPLACE or MERGE with the config below.
# If you only have a default agent, add the new ones to the "list" array.
