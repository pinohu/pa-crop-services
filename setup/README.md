# PA CROP Services — Dedicated Machine Setup

## One-Line Install

### Windows (PowerShell as Administrator)
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.ps1 | iex
```

### Linux / macOS / WSL2
```bash
curl -fsSL https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.sh | bash
```

## What It Installs

| Component | What | Where |
|-----------|------|-------|
| Node.js 22+ | JavaScript runtime | System global |
| Git | Version control | System global |
| OpenClaw | AI agent platform | `~/.openclaw/` |
| 4 CROP Agents | CEO, Developer, Marketer, Ops | `~/.openclaw/workspaces/` |
| Mission Control | Visual agent dashboard | `~/openclaw-mission-control/` |
| PA CROP Services repo | The entire business | `~/pa-crop-services/` |
| Vercel CLI | Website deployment | System global |
| Claude Code | Terminal AI coding | System global |

## After Install

The script prints a box with 5 next steps. The first one is:

```bash
openclaw onboard --install-daemon
```

This launches the interactive wizard where you connect your Anthropic API key and Telegram.

## Hardware Requirements

Minimum for a dedicated CROP operations machine:
- 4 GB RAM
- 20 GB disk
- Any modern CPU
- Internet connection
- Runs 24/7 (for OpenClaw daemon and Mission Control)

A used mini PC (Lenovo ThinkCentre, HP EliteDesk, Intel NUC) for $100-150 on eBay is perfect. Or a $5/month VPS (Hetzner, DigitalOcean, Vultr).
