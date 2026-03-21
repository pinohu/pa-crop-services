# ============================================================
# PA CROP Services — Dedicated Windows Machine Setup
# ============================================================
# Run in PowerShell (as Administrator):
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   irm https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.ps1 | iex
#
# Or clone first and run:
#   git clone https://github.com/pinohu/pa-crop-services.git
#   cd pa-crop-services
#   .\setup\install.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Log($msg) { Write-Host "[CROP] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Header($msg) {
    Write-Host ""
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================
Header "PHASE 1: System Prerequisites"
# ============================================================

# Check Node.js
$nodeInstalled = $false
try {
    $nodeVer = (node -v 2>$null)
    if ($nodeVer) {
        $major = [int]($nodeVer.TrimStart('v').Split('.')[0])
        if ($major -ge 22) {
            Log "Node.js $nodeVer ✓"
            $nodeInstalled = $true
        } else {
            Warn "Node.js $nodeVer is too old. Installing v22..."
        }
    }
} catch {}

if (-not $nodeInstalled) {
    Log "Installing Node.js 22 via winget..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>$null
    if ($LASTEXITCODE -ne 0) {
        Warn "winget failed. Download Node.js manually from https://nodejs.org"
        Warn "Install Node.js 22+, then re-run this script."
        exit 1
    }
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Log "Node.js installed: $(node -v)"
}

# Check Git
try {
    $gitVer = git --version 2>$null
    if ($gitVer) {
        Log "Git $($gitVer -replace 'git version ','') ✓"
    } else { throw }
} catch {
    Log "Installing Git via winget..."
    winget install Git.Git --accept-package-agreements --accept-source-agreements 2>$null
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ============================================================
Header "PHASE 2: Clone PA CROP Services Repository"
# ============================================================

$CropHome = Join-Path $HOME "pa-crop-services"

if (Test-Path $CropHome) {
    Log "Repository already exists. Pulling latest..."
    Set-Location $CropHome
    git pull origin main
} else {
    Log "Cloning pinohu/pa-crop-services..."
    git clone https://github.com/pinohu/pa-crop-services.git $CropHome
    Set-Location $CropHome
}

$commitMsg = git log --oneline -1
Log "Repository ready: $commitMsg"
$fileCount = (git ls-files | Measure-Object).Count
Log "Files: $fileCount"

# ============================================================
Header "PHASE 3: Install OpenClaw"
# ============================================================

$openclawInstalled = $false
try {
    $ocVer = openclaw --version 2>$null
    if ($ocVer) {
        Log "OpenClaw already installed: $ocVer"
        $openclawInstalled = $true
    }
} catch {}

if (-not $openclawInstalled) {
    Log "Installing OpenClaw globally..."
    npm install -g openclaw@latest
    Log "OpenClaw installed ✓"
}

# ============================================================
Header "PHASE 4: Configure Agent Workspaces"
# ============================================================

$OpenClawHome = Join-Path $HOME ".openclaw"
$workspaces = @("crop-ceo", "crop-developer", "crop-marketer", "crop-ops")

foreach ($ws in $workspaces) {
    $wsPath = Join-Path $OpenClawHome "workspaces\$ws"
    if (-not (Test-Path $wsPath)) {
        New-Item -ItemType Directory -Path $wsPath -Force | Out-Null
    }
}
Log "Workspace directories created ✓"

# Clone repo into developer workspace if not already there
$devRepo = Join-Path $OpenClawHome "workspaces\crop-developer\pa-crop-services"
if (-not (Test-Path $devRepo)) {
    Log "Cloning repo into developer workspace..."
    git clone https://github.com/pinohu/pa-crop-services.git $devRepo
}

# Copy docs to agent workspaces
$copies = @{
    "PA-CROP-Execution-Plan.md" = "crop-ceo"
    "PA-CROP-AI-Agent-Orchestration-Guide.md" = "crop-ceo"
}
foreach ($file in $copies.Keys) {
    $src = Join-Path $CropHome $file
    $dst = Join-Path $OpenClawHome "workspaces\$($copies[$file])\$file"
    if (Test-Path $src) { Copy-Item $src $dst -Force }
}

$opsBible = Join-Path $CropHome "operations\PA-CROP-Operations-Bible.md"
if (Test-Path $opsBible) {
    Copy-Item $opsBible (Join-Path $OpenClawHome "workspaces\crop-ops\PA-CROP-Operations-Bible.md") -Force
}

$seoArticles = Join-Path $CropHome "marketing\seo-articles\PA-CROP-SEO-Articles.md"
if (Test-Path $seoArticles) {
    Copy-Item $seoArticles (Join-Path $OpenClawHome "workspaces\crop-marketer\PA-CROP-SEO-Articles.md") -Force
}

Log "Agent workspace docs populated ✓"

# ============================================================
Header "PHASE 5: Merge CROP Agents into OpenClaw Config"
# ============================================================

$configPath = Join-Path $OpenClawHome "openclaw.json"
$agentsPath = Join-Path $CropHome "openclaw\openclaw-agents.json"

if (Test-Path $configPath) {
    Log "Existing openclaw.json found. Backing up and merging..."
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    Copy-Item $configPath "$configPath.backup.$timestamp"

    python3 -c @"
import json, os
config_path = r'$configPath'
agents_path = r'$agentsPath'
with open(config_path) as f: config = json.load(f)
with open(agents_path) as f: crop = json.load(f)
if 'agents' not in config: config['agents'] = {'list': []}
if 'list' not in config.get('agents', {}): config['agents']['list'] = []
existing = {a.get('id') for a in config['agents']['list']}
added = 0
for a in crop['agents']['list']:
    if a['id'] not in existing:
        config['agents']['list'].append(a)
        added += 1
config['agents']['defaults'] = crop['agents'].get('defaults', {})
if 'bindings' not in config: config['bindings'] = []
for b in crop.get('bindings', []):
    if b not in config['bindings']: config['bindings'].append(b)
with open(config_path, 'w') as f: json.dump(config, f, indent=2)
print(f'Merged: {added} new agents. Total: {len(config["agents"]["list"])}')
"@ 2>$null

    if ($LASTEXITCODE -ne 0) {
        Warn "Python merge failed. Copying CROP config directly..."
        Copy-Item $agentsPath $configPath -Force
    }
} else {
    Log "No existing config. Using CROP agent config..."
    Copy-Item $agentsPath $configPath -Force
    Log "Created openclaw.json with 4 CROP agents"
}

# ============================================================
Header "PHASE 6: Install Mission Control"
# ============================================================

$MCHome = Join-Path $HOME "openclaw-mission-control"

if (-not (Test-Path $MCHome)) {
    Log "Cloning Mission Control..."
    git clone https://github.com/abhi1693/openclaw-mission-control.git $MCHome 2>$null
    if ($LASTEXITCODE -ne 0) {
        git clone https://github.com/crshdn/mission-control.git $MCHome 2>$null
    }
}

if (Test-Path $MCHome) {
    Set-Location $MCHome
    Log "Installing Mission Control dependencies..."
    npm install 2>$null
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local" -Force 2>$null
    }
    Log "Mission Control ready. Run: cd $MCHome; npm run dev"
}

# ============================================================
Header "PHASE 7: Install Vercel CLI + Claude Code"
# ============================================================

try { vercel --version 2>$null | Out-Null; Log "Vercel CLI ✓" }
catch { Log "Installing Vercel CLI..."; npm install -g vercel }

try { claude --version 2>$null | Out-Null; Log "Claude Code ✓" }
catch {
    Log "Installing Claude Code..."
    npm install -g @anthropic-ai/claude-code 2>$null
    if ($LASTEXITCODE -ne 0) { Warn "Claude Code install failed. Install manually later." }
}

# ============================================================
Header "SETUP COMPLETE"
# ============================================================

Set-Location $CropHome

Write-Host ""
Log "PA CROP Services installed at: $CropHome"
Log "OpenClaw config at: $configPath"
Log "Mission Control at: $MCHome"
Write-Host ""
Write-Host "┌─────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "│              NEXT STEPS (do these manually)             │" -ForegroundColor Green
Write-Host "├─────────────────────────────────────────────────────────┤" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "│  1. Run OpenClaw onboarding:                           │" -ForegroundColor Green
Write-Host "│     openclaw onboard --install-daemon                  │" -ForegroundColor Green
Write-Host "│     > Select Anthropic, paste API key, pick Telegram   │" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "│  2. Start Mission Control:                             │" -ForegroundColor Green
Write-Host "│     cd ~/openclaw-mission-control                      │" -ForegroundColor Green
Write-Host "│     npm run dev                                        │" -ForegroundColor Green
Write-Host "│     > Open http://localhost:4000                       │" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "│  3. Deploy website:                                    │" -ForegroundColor Green
Write-Host "│     cd ~/pa-crop-services && vercel --prod             │" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "│  4. Replace placeholders in public/*.html              │" -ForegroundColor Green
Write-Host "│     STRIPE_STARTER_LINK                                │" -ForegroundColor Green
Write-Host "│     STRIPE_PROFESSIONAL_LINK                           │" -ForegroundColor Green
Write-Host "│     STRIPE_PREMIUM_LINK                                │" -ForegroundColor Green
Write-Host "│     GA_MEASUREMENT_ID                                  │" -ForegroundColor Green
Write-Host "│     BUSINESS_PHONE                                     │" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "│  5. Open Cursor IDE:                                   │" -ForegroundColor Green
Write-Host "│     Open ~/pa-crop-services in Cursor                  │" -ForegroundColor Green
Write-Host "│     .cursorrules gives full project context             │" -ForegroundColor Green
Write-Host "│                                                         │" -ForegroundColor Green
Write-Host "└─────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Host "Run " -NoNewline
Write-Host "openclaw onboard --install-daemon" -ForegroundColor Yellow -NoNewline
Write-Host " now to start."
