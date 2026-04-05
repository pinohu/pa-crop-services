# DESIGN.md — PA CROP Services (pacropservices.com)

> **Inherits from**: `DYNASTY-DESIGN.md` (read that first)  
> **Base sources**: Supabase dark dashboard aesthetic + Notion warm minimalism for knowledge base sections  
> **Product identity**: Pennsylvania government compliance meets founder-class authority — serious, precise, trustworthy

---

## 1. Visual Theme & Atmosphere

PA CROP Services operates in the government compliance space for Pennsylvania businesses. The design must communicate two things simultaneously: the seriousness of a compliance authority and the approachability of a service business. This is achieved through a hybrid identity — the Supabase dark dashboard for the portal and admin experience, Notion's warm minimalism for the public-facing marketing and knowledge base.

The marketing site opens on near-white (`#FAFAFA`) with warm near-black (`#141413`) text — a cleaner, warmer version of the dark Supabase palette inverted for daylight reading. The PA CROP green (`#3ECF8E`) appears selectively as the brand accent: in the logo, on verified status badges, on CTA hover states, and on compliance progress indicators. It's a signal, not a decoration.

For the portal dashboard (admin + client-facing), the palette inverts: near-black (`#171717`) canvas with the emerald green accent maintaining identity continuity across both contexts. Notion's knowledge base aesthetic — warm white `#F6F5F4` section backgrounds, serif-adjacent font hierarchy, whisper-thin borders — governs the 25 knowledge base articles and documentation sections.

**Key Characteristics:**
- Dual-surface system: light (`#FAFAFA`) for marketing, dark (`#171717`) for portal
- PA CROP Green (`#3ECF8E`) — identity marker, used sparingly; compliance signal
- Inter across all surfaces — legible, neutral, authority-grade at all weights
- Source Code Pro for document numbers, reference codes, and technical labels
- Notion-style warm minimalism for KB: warm white sections, whisper borders, generous line-height
- Supabase-style dark dashboard: border-defined depth, no shadows, pill primary CTAs
- WCAG AA enforced across all surfaces — compliance product must be accessible

---

## 2. Color Palette & Roles

### Marketing Surface (Light Mode)

| Color | Hex | Role |
|---|---|---|
| Page Background | `#FAFAFA` | Primary canvas — warm off-white |
| Section Alt | `#F6F5F4` | KB sections, alternating backgrounds (Notion-borrowed warm white) |
| Pure White | `#FFFFFF` | Card surfaces, form fields |
| Primary Text | `#141413` | Headings, body copy — warm near-black |
| Secondary Text | `#615D59` | Descriptions, secondary labels — Notion warm gray |
| Muted Text | `#A39E98` | Placeholders, tertiary metadata |
| Border Whisper | `rgba(0,0,0,0.08)` | Standard card borders, dividers |
| Border Standard | `rgba(0,0,0,0.12)` | Input fields, emphasized containers |

### Portal / Dashboard Surface (Dark Mode)

| Color | Hex | Role |
|---|---|---|
| Page Background | `#171717` | Dashboard canvas |
| Panel Dark | `#0F0F0F` | Sidebar, nested panels |
| Surface | `#242424` | Card surfaces, dropdowns |
| Border Subtle | `#2E2E2E` | Standard card borders |
| Border Standard | `#363636` | Button borders, dividers |
| Primary Text | `#FAFAFA` | Main text on dark |
| Secondary Text | `#B4B4B4` | Secondary labels |
| Muted Text | `#898989` | Tertiary metadata, footer links |

### Brand & Interactive (Both Surfaces)

| Color | Hex | Role |
|---|---|---|
| CROP Green | `#3ECF8E` | Brand identity, logo, compliance indicators |
| CROP Green Link | `#00C573` | Interactive links, hover states |
| CROP Green Border | `rgba(62,207,142,0.3)` | Accent borders on highlighted elements |
| CROP Green Surface | `rgba(62,207,142,0.08)` | Tinted card backgrounds for featured elements |
| Green Badge BG | `rgba(62,207,142,0.15)` | Compliant/verified badge fill |
| Green Badge Text | `#059669` | Compliant status text |

### Status System (Compliance-Specific)

| Status | Background | Text | Border | Use |
|---|---|---|---|---|
| Compliant | `rgba(62,207,142,0.15)` | `#059669` | `rgba(62,207,142,0.3)` | Annual report filed, cert valid |
| Pending Review | `rgba(255,165,0,0.12)` | `#8B5A00` | `rgba(255,165,0,0.3)` | Submitted, awaiting processing |
| Due Soon | `rgba(251,191,36,0.12)` | `#92400E` | `rgba(251,191,36,0.3)` | Deadline within 30 days |
| Overdue | `rgba(229,62,62,0.12)` | `#B53333` | `rgba(229,62,62,0.3)` | Past due date |
| Exempt | `rgba(100,116,139,0.12)` | `#475569` | `rgba(100,116,139,0.3)` | Filing exemption applies |
| Admin Note | `rgba(121,40,202,0.12)` | `#6B21A8` | `rgba(121,40,202,0.3)` | Internal admin marker |

### Dynasty Premium

- **Dynasty Gold** (`#C9A84C`): Premium plan tier markers, trusted advisor badge
- **Gold Surface** (`#F0D99A`): Gold badge backgrounds

---

## 3. Typography Rules

### Font Stack
- **Primary**: `Inter`, fallback: `-apple-system, system-ui, Segoe UI, sans-serif`
- **Code / Reference**: `Source Code Pro`, fallback: `Office Code Pro, Menlo, monospace`

### Hierarchy — Marketing / Light Surface

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| Hero Display | Inter | 52px | 700 | 1.05 | −2.0px | Main hero headline |
| Section Heading | Inter | 36px | 700 | 1.10 | −1.0px | Feature section titles |
| Card Title Large | Inter | 26px | 700 | 1.20 | −0.5px | Major card headings |
| Card Title | Inter | 20px | 600 | 1.25 | −0.2px | Standard card titles |
| Sub-heading | Inter | 16px | 600 | 1.50 | −0.1px | Section sub-labels |
| Body Large | Inter | 18px | 400 | 1.60 | normal | Hero descriptions, KB intros |
| Body | Inter | 16px | 400 | 1.60 | normal | Standard reading text |
| Body Emphasis | Inter | 16px | 500 | 1.50 | normal | Navigation, emphasized text |
| Nav / Button | Inter | 15px | 500 | 1.40 | normal | Buttons, nav links |
| Caption | Inter | 14px | 400 | 1.50 | normal | Metadata, descriptions |
| Label | Inter | 13px | 500 | 1.30 | 0.1px | Badges, small labels |
| Overline | Inter | 12px | 500 | 1.20 | 0.6px | Uppercase section markers |
| Doc Number | Source Code Pro | 13px | 400 | 1.40 | 0.5px | Filing numbers, cert IDs, EIN refs |

### Hierarchy — Portal / Dark Surface

| Role | Font | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|---|
| Panel Title | Inter | 20px | 600 | 1.25 | −0.2px | Dashboard panel headers |
| Section Title | Inter | 16px | 600 | 1.40 | −0.1px | Sub-panel headers |
| Table Header | Inter | 13px | 600 | 1.30 | 0.2px | Table column headers, uppercase |
| Body | Inter | 14px | 400 | 1.50 | normal | Portal body text |
| Body Emphasis | Inter | 14px | 500 | 1.50 | normal | Emphasized portal content |
| Nav Link | Inter | 14px | 500 | 1.30 | normal | Sidebar navigation |
| Caption | Inter | 12px | 400 | 1.40 | normal | Table metadata, timestamps |
| Filing ID | Source Code Pro | 12px | 400 | 1.40 | 0.8px | Document reference numbers |
| Tech Label | Source Code Pro | 11px | 500 | 1.20 | 0.8px | Uppercase technical labels |

### Knowledge Base Typography (Notion-inherited)

- **KB Article Title**: Inter 36px weight 700, line-height 1.10, letter-spacing −1.0px
- **KB Section Header (H2)**: Inter 22px weight 700, line-height 1.20, letter-spacing −0.2px
- **KB Sub-header (H3)**: Inter 18px weight 600, line-height 1.30
- **KB Body**: Inter 16px weight 400, line-height 1.70 — more generous for long-form reading
- **KB Callout**: Inter 15px weight 400, border-left `3px solid #3ECF8E`, padding `12px 16px`, background `rgba(62,207,142,0.06)`
- **KB Note/Warning**: Inter 15px weight 400, border-left `3px solid #FFA500`, padding `12px 16px`, background `rgba(255,165,0,0.06)`
- **KB Code Block**: Source Code Pro 13px, background `#F6F5F4`, padding `16px`, radius `6px`, border `rgba(0,0,0,0.08) 0px 0px 0px 1px`

---

## 4. Component Stylings

### Buttons — Marketing (Light Surface)

**Primary — Dark Pill**
- Background: `#141413`
- Text: `#FAFAFA`
- Padding: `10px 28px`
- Radius: `9999px`
- Border: `1px solid #FAFAFA`
- Hover: `opacity 0.85`
- Use: "Get Started", "Schedule a Call"

**Secondary — Ghost Pill**
- Background: `#FAFAFA`
- Text: `#141413`
- Padding: `10px 28px`
- Radius: `9999px`
- Border: `1px solid rgba(0,0,0,0.12)`
- Use: "Learn More", "View Plans"

**Green Accent CTA**
- Background: `#3ECF8E`
- Text: `#141413`
- Padding: `10px 28px`
- Radius: `9999px`
- Use: Special compliance-season CTAs

### Buttons — Portal (Dark Surface)

**Primary Portal**
- Background: `#0F0F0F`
- Text: `#FAFAFA`
- Padding: `8px 20px`
- Radius: `9999px`
- Border: `1px solid #FAFAFA`
- Focus: `box-shadow: 0 0 0 2px #3ECF8E`
- Use: Primary portal actions

**Secondary Portal**
- Background: `#0F0F0F`
- Text: `#FAFAFA`
- Padding: `8px 20px`
- Radius: `9999px`
- Border: `1px solid #2E2E2E`
- Opacity: `0.8`
- Use: Secondary portal actions

**Ghost Portal**
- Background: transparent
- Text: `#B4B4B4`
- Padding: `8px 12px`
- Radius: `6px`
- Use: Icon buttons, tertiary actions

### Cards — Marketing Surface

**Standard Service Card**
- Background: `#FFFFFF`
- Border: `1px solid rgba(0,0,0,0.08)`
- Radius: `12px`
- Padding: `24px`
- Shadow: `rgba(0,0,0,0.03) 0px 2px 6px`
- Hover: border `rgba(62,207,142,0.3)`, shadow `rgba(62,207,142,0.08) 0px 4px 16px`

**Pricing Card**
- Background: `#FFFFFF`
- Border: `1px solid rgba(0,0,0,0.08)`
- Radius: `16px`
- Padding: `32px`
- Featured variant: border `2px solid #3ECF8E`, top accent bar `4px solid #3ECF8E`

**KB Article Card**
- Background: `#FFFFFF` or `#F6F5F4`
- Border: `1px solid rgba(0,0,0,0.08)`
- Radius: `8px`
- Padding: `20px 24px`
- Category tag: Source Code Pro 11px uppercase, `#3ECF8E`

### Cards — Portal / Dashboard

**Portal Panel**
- Background: `#242424`
- Border: `1px solid #2E2E2E`
- Radius: `8px`
- Padding: `20px`
- Header border-bottom: `1px solid #2E2E2E`

**Compliance Status Card**
- Background: `#242424`
- Border: `1px solid #2E2E2E`
- Radius: `8px`
- Green-accented: border-left `3px solid #3ECF8E`
- Status large display: filing status in appropriate badge + large Inter metric

**Client Record Card**
- Background: `#242424`
- Border: `1px solid #2E2E2E`
- Radius: `8px`
- Business name: `16px Inter weight 600, #FAFAFA`
- EIN/entity ID: Source Code Pro `13px, #898989`
- Next filing due: status badge pill

### Data Tables — Portal

- Container: `8px` radius, `1px solid #2E2E2E`
- Header: `#0F0F0F` background, `12px Inter weight 600, #898989`, uppercase, `0.5px` tracking
- Row: `#171717` default, `#242424` on hover
- Row border: `1px solid #2E2E2E`
- Cell height: `52px` standard, `44px` compact
- Filing ID column: Source Code Pro `12px`
- Date column: Inter `14px`
- Status column: badge pill
- Amount column: Inter `14px`, right-aligned, Geist Mono if numerical precision needed

### Navigation — Marketing

- Background: `#FAFAFA`, sticky, backdrop-blur `12px`
- Border-bottom: `1px solid rgba(0,0,0,0.08)`
- Logo: PA CROP wordmark + green icon
- Links: `15px Inter weight 500, #141413`
- Hover: `#3ECF8E` (green)
- CTA: Dark pill button, right-aligned

### Navigation — Portal Sidebar

- Background: `#0F0F0F`
- Width: `240px`
- Border-right: `1px solid #2E2E2E`
- Logo area: `56px` height, border-bottom `1px solid #2E2E2E`
- Nav item: `14px Inter weight 500, #898989`
- Active: `#FAFAFA` text, `rgba(62,207,142,0.08)` background, `3px solid #3ECF8E` left border
- Section header: `11px Inter weight 600, #636363`, uppercase, `0.8px` tracking

---

## 5. Layout Principles

### Marketing Pages
- Max-width: `1200px`, centered
- Hero: centered, `96px` top padding desktop
- Service feature grid: 3-column desktop, 2-column tablet, 1-column mobile
- KB grid: 3-column card grid for article listings
- Section spacing: `80px` desktop, `56px` mobile

### Portal Dashboard
- Top bar: `56px` height
- Sidebar: `240px` fixed
- Content padding: `24px`
- Stat row: 4-column desktop, 2-column tablet
- Panel grid: 12-column, `16px` gaps

### Knowledge Base
- Article max-width: `760px` (reading-optimized)
- Sidebar TOC: `220px` fixed right on desktop
- KB body line-height: `1.70` — generous for long-form compliance reading
- Section callouts: full-width within article column

### Whitespace Philosophy (Notion-inherited for KB)
- Warm white (`#F6F5F4`) alternates with pure white (`#FFFFFF`) sections
- No hard borders between sections — background color shift creates separation
- 64–80px padding between major KB sections
- Body text islands: compact paragraphs surrounded by generous vertical space

---

## 6. Depth & Elevation

### Light Surface (Marketing)

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow | Page background |
| Whisper | `1px solid rgba(0,0,0,0.08)` | Standard card borders |
| Lifted | `1px solid rgba(0,0,0,0.08)` + `rgba(0,0,0,0.03) 0px 2px 6px` | Hovered cards |
| Green Accent | border `rgba(62,207,142,0.3)` + `rgba(62,207,142,0.08) 0px 4px 16px` | Featured/active cards |
| Focus | `0 0 0 2px #3ECF8E` | All interactive elements |

### Dark Surface (Portal)

| Level | Treatment | Use |
|---|---|---|
| Page | `#171717` | Canvas |
| Card | `#242424` + `1px solid #2E2E2E` | Standard panels |
| Elevated | `#242424` + `1px solid #363636` | Hovered panels, dropdowns |
| Brand Accent | `border-left: 3px solid #3ECF8E` | Highlighted compliance items |
| Focus | `0 0 0 2px #3ECF8E` | All interactive elements |

**Shadow Philosophy**: On the dark portal surface, following Supabase's approach — no drop shadows. Depth is communicated through border hierarchy (`#2E2E2E` → `#363636`) and background level steps (`#171717` → `#242424`). On the light marketing surface, shadows are whisper-weight (max 0.05 opacity). The green accent border is the "featured" signal on both surfaces.

---

## 7. Do's and Don'ts

### Do
- Use CROP Green (`#3ECF8E`) as the identity and compliance signal — not a decorative element
- Use pill-shape (9999px) for all primary CTA buttons on both surfaces
- Apply Source Code Pro to all filing numbers, EIN references, cert IDs, and doc codes
- Use Notion-style warm backgrounds (`#F6F5F4`) for KB sections — creates reading comfort
- Use border-left `3px solid #3ECF8E` to mark featured or in-progress compliance items
- Apply generous line-height (1.70) on KB article body text
- Maintain whisper-thin borders (`rgba(0,0,0,0.08)`) on light surfaces — never heavy lines
- Label all status badges — color alone is insufficient for accessibility
- Focus ring: `0 0 0 2px #3ECF8E` on all interactive elements

### Don't
- Don't use CROP Green as a background fill on large surfaces — accent only
- Don't add drop shadows to the dark portal surface — use border hierarchy instead
- Don't use Geist (LeadOS-Gov font) in PA CROP — Inter is the PA CROP font
- Don't use blue as a primary accent — blue is for LeadOS-Gov; green is PA CROP's territory
- Don't use sharp corners (< 6px) on any user-facing component
- Don't reduce KB body line-height below 1.60 — compliance reading needs comfort
- Don't make the dark portal surface pure black (`#000000`) — `#171717` preserves warmth

---

## 8. Responsive Behavior

| Breakpoint | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Single column, pill CTAs full-width, sidebar → drawer |
| Tablet | 640–1024px | 2-column marketing, condensed sidebar |
| Desktop | 1024–1280px | Full 3-column marketing, full sidebar |
| Large | > 1280px | Centered with generous margins |

**Mobile-specific**
- KB TOC: collapses to inline expandable accordion
- Portal sidebar: slide-over drawer triggered by hamburger
- Data tables: horizontal scroll, sticky first column (Business Name)
- Status badges: visible at all sizes — never truncated

---

## 9. Agent Prompt Guide

### Quick Color Reference — Light (Marketing)

- Background: `#FAFAFA`
- Alt Section: `#F6F5F4`
- Heading: `#141413`
- Body: `#141413`
- Secondary: `#615D59`
- Muted: `#A39E98`
- Border: `rgba(0,0,0,0.08)`
- Brand Green: `#3ECF8E`
- CTA (marketing): dark pill `#141413`

### Quick Color Reference — Dark (Portal)

- Background: `#171717`
- Panel: `#242424`
- Text: `#FAFAFA`
- Secondary: `#B4B4B4`
- Muted: `#898989`
- Border: `#2E2E2E`
- Brand Green: `#3ECF8E`
- CTA (portal): dark pill `#0F0F0F`

### Example Component Prompts

- **"Marketing Hero"**: `#FAFAFA` background. Headline 52px Inter weight 700, line-height 1.05, letter-spacing −2.0px, `#141413`. Subtitle 18px Inter weight 400, line-height 1.60, `#615D59`. Dark pill CTA (`#141413` bg, `#FAFAFA` text, 9999px radius, 10px 28px padding). Ghost pill secondary.
- **"Service Card"**: White card, `1px solid rgba(0,0,0,0.08)`, 12px radius, 24px padding. Title 20px Inter weight 600, `#141413`. Body 16px weight 400, `#615D59`. Hover: border `rgba(62,207,142,0.3)`.
- **"Compliance Status Card"**: Dark portal. `#242424` bg, `1px solid #2E2E2E`, 8px radius, `3px solid #3ECF8E` left border. Business name 16px Inter 600, `#FAFAFA`. EIN Source Code Pro 13px, `#898989`. Status badge pill.
- **"KB Article"**: `#F6F5F4` or `#FFFFFF` background. Title 36px Inter 700, −1.0px tracking. Body 16px weight 400, line-height 1.70. Callout: `3px solid #3ECF8E` left border, `rgba(62,207,142,0.06)` bg.
- **"Status Badge"**: Use compliance status table in Section 2. Pill shape, labeled text, semantic colors only.

### Iteration Guide
1. Green (`#3ECF8E`) is the compliance signal — every meaningful compliance state should reference it
2. Light surface: whisper borders, warm backgrounds, Notion-inspired reading comfort
3. Dark portal: no shadows, border hierarchy only (`#2E2E2E` → `#363636`)
4. Source Code Pro for all reference numbers — this signals government-grade precision
5. Pill buttons (9999px) across both surfaces for primary CTAs
6. Status always needs a label — never rely on color alone for state communication
