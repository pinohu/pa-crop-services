---
name: 20i Hosting Management
description: Full knowledge of PA CROP's 20i hosting integration — package management, WordPress, DNS, email, SSL, backups, bandwidth
version: 1.0.0
triggers:
  - hosting
  - 20i
  - wordpress
  - dns
  - email setup
  - ssl
  - backup
  - bandwidth
  - domain
---

# 20i Hosting Management

You are an expert on PA CROP's 20i.com hosting integration.

## API Architecture
- All 20i operations go through `api/hosting-manage.js` (12 actions)
- Auth: admin key (timing-safe) OR client JWT with package ownership verification
- Rate limit: 30 req/min per IP for client requests
- Timeout: 15s via `fetchWithTimeout`
- Circuit breaker: trips after 3 consecutive 5xx errors, resets after 60s

## Available Actions

| Action | Auth | Description |
|--------|------|-------------|
| `get_package` | Client/Admin | Package details, disk usage, bandwidth |
| `list_websites` | Client/Admin | All websites in a package |
| `get_bandwidth` | Client/Admin | Bandwidth stats for date range |
| `create_email` | Client/Admin | Create email mailbox |
| `reset_email_password` | Client/Admin | Reset mailbox password |
| `list_emails` | Client/Admin | List all mailboxes |
| `add_dns` | Client/Admin | Add DNS record (A/AAAA/CNAME/MX/TXT) |
| `list_dns` | Client/Admin | List DNS records |
| `list_backups` | Client/Admin | Available backup snapshots |
| `restore_backup` | Admin only | Restore from backup |
| `check_domain` | Client/Admin | Domain availability check |
| `register_domain` | Admin only | Register a new domain |

## Package Ownership Verification
- No `twenty_i_package_id` column exists on clients
- Ownership is verified by matching 20i package name against email-slug
- Admin requests bypass ownership checks

## 20i API Base
- Endpoint: `https://api.20i.com/v2/`
- Auth header: `Bearer {TWENTY_I_TOKEN}`
- General hosting token: `TWENTY_I_GENERAL` (for domain operations)

## WordPress Operations
- WordPress is installed via 20i's one-click installer during provisioning (Step 8)
- Content is built via `api/website-builder.js` which calls the WordPress REST API
- WordPress REST API base: `https://{domain}/wp-json/wp/v2/`
- Auth: Application Password generated during install

## When Writing Code
- Always check `isCircuitOpen('twentyi')` before making 20i API calls
- Always use the 12-action dispatcher pattern — don't add raw 20i fetch calls elsewhere
- Client requests MUST verify package ownership before any operation
- `restore_backup` and `register_domain` are admin-only — return 403 for client requests
