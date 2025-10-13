{
  "product": {
    "name": "Signify KZ",
    "tagline": "Remote contracts, signed simply and securely",
    "market": "Kazakhstan (RU/KZ/EN)",
    "audience": ["contract creators", "signers", "small businesses", "freelancers"],
    "brand_attributes": ["trustworthy", "professional", "calm", "minimal", "accessible"],
    "success_actions": [
      "user registers/logs in",
      "creates a contract",
      "sends for signature (SMS/call verification)",
      "signer completes OTP and signs",
      "creator downloads PDF"
    ]
  },

  "design_personality": {
    "style": "Modern Minimalism with light neutrals and calm blues",
    "tone": "Clear, helpful, non‑intimidating legal tech",
    "motion": "Subtle and purposeful; no bounce; micro-delights on hover/focus/submit"
  },

  "color_system": {
    "notes": "Avoid dark backgrounds; prioritize high contrast on white. Use gentle, desaturated hues to signal trust and security.",
    "palette_hex": {
      "primary": "#0B6DAE",           
      "primary-600": "#0A5F99",
      "primary-50": "#E9F2FA",
      "accent": "#1FB6A3",            
      "accent-50": "#E9F8F6",
      "neutral-900": "#0F172A",
      "neutral-700": "#334155",
      "neutral-500": "#64748B",
      "neutral-300": "#CBD5E1",
      "neutral-100": "#F1F5F9",
      "surface": "#FFFFFF",
      "success": "#16A34A",
      "warning": "#D97706",
      "danger": "#DC2626",
      "info": "#0284C7"
    },
    "status_map": {
      "draft": "neutral-300",
      "sent": "info",
      "pending-signature": "warning",
      "signed": "success",
      "declined": "danger",
      "expired": "neutral-500"
    },
    "gradient_usage": {
      "allow": [
        "Hero section background only (max 20% of viewport)",
        "Section separators as decorative bands",
        "Large empty-state illustrations"
      ],
      "avoid": [
        "Small UI elements",
        "Text-heavy blocks",
        "Any dark/saturated combos"
      ],
      "examples_css": [
        "bg-[linear-gradient(135deg,_#F6FAFF_0%,_#F1FBF9_60%,_#FFFFFF_100%)]",
        "bg-[linear-gradient(180deg,_#F6FAFF_0%,_#FFFFFF_100%)]"
      ]
    },
    "tailwind_tokens_overrides": {
      "add_to_index.css_root": ":root{--background:0 0% 100%;--foreground:222 47% 11%;--card:0 0% 100%;--card-foreground:222 47% 11%;--primary:206 86% 36%;--primary-foreground:0 0% 100%;--accent:172 73% 42%;--accent-foreground:180 5% 14%;--muted:210 40% 96%;--muted-foreground:215 16% 47%;--success:142 71% 35%;--warning:36 100% 45%;--destructive:0 72% 51%;--border:214 32% 91%;--input:214 32% 91%;--ring:206 86% 36%;--radius:0.5rem;}"
    }
  },

  "typography": {
    "fonts": {
      "heading": "Chivo",
      "body": "IBM Plex Sans",
      "mono": "Roboto Mono"
    },
    "google_fonts_import": "https://fonts.googleapis.com/css2?family=Chivo:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap",
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl tracking-tight",
      "h2": "text-base sm:text-lg font-semibold text-neutral-900",
      "h3": "text-lg font-semibold",
      "body": "text-sm sm:text-base leading-7 text-neutral-700",
      "muted": "text-sm text-neutral-500"
    },
    "usage": [
      "Headlines (Chivo) are compact and confident; keep to 2 lines max",
      "Body (IBM Plex Sans) with comfortable line-height (leading-7)"
    ]
  },

  "spacing_and_layout": {
    "container": "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    "grid": {
      "mobile": "single column with 24px vertical rhythm",
      "tablet": "6-col grid, 8px gutter",
      "desktop": "12-col grid, 16px gutter"
    },
    "card": "rounded-lg border bg-white shadow-sm",
    "elevation": {
      "low": "shadow-[0_1px_2px_rgba(16,24,40,0.06)]",
      "mid": "shadow-[0_8px_16px_rgba(16,24,40,0.08)]"
    },
    "radius": "rounded-md"
  },

  "components": {
    "button": {
      "style": "Professional/Corporate",
      "variants": {
        "primary": "bg-primary text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:bg-primary/90",
        "secondary": "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        "ghost": "bg-transparent text-neutral-900 hover:bg-neutral-100",
        "destructive": "bg-destructive text-white hover:bg-destructive/90"
      },
      "sizes": {
        "sm": "h-9 px-3 text-sm",
        "md": "h-10 px-4",
        "lg": "h-12 px-6 text-base"
      },
      "data_testid_rule": "All buttons must include data-testid with role-based kebab-case naming, e.g., data-testid=\"create-contract-primary-button\""
    },
    "inputs": {
      "field": "./frontend/src/components/ui/input.jsx",
      "otp": "./frontend/src/components/ui/input-otp.jsx",
      "select": "./frontend/src/components/ui/select.jsx",
      "date": "./frontend/src/components/ui/calendar.jsx",
      "textarea": "./frontend/src/components/ui/textarea.jsx",
      "rules": [
        "Include clear label and helper text",
        "Use data-testid e.g., data-testid=\"contract-title-input\"",
        "Visible focus ring via Tailwind ring-primary"
      ]
    },
    "data_display": {
      "table": "./frontend/src/components/ui/table.jsx",
      "badge": "./frontend/src/components/ui/badge.jsx",
      "card": "./frontend/src/components/ui/card.jsx",
      "progress": "./frontend/src/components/ui/progress.jsx",
      "tabs": "./frontend/src/components/ui/tabs.jsx",
      "skeleton": "./frontend/src/components/ui/skeleton.jsx"
    },
    "feedback": {
      "toast": "./frontend/src/components/ui/sonner.jsx",
      "alert_dialog": "./frontend/src/components/ui/alert-dialog.jsx",
      "dialog": "./frontend/src/components/ui/dialog.jsx",
      "tooltip": "./frontend/src/components/ui/tooltip.jsx"
    },
    "navigation": {
      "nav_menu": "./frontend/src/components/ui/navigation-menu.jsx",
      "menubar": "./frontend/src/components/ui/menubar.jsx",
      "breadcrumbs": "./frontend/src/components/ui/breadcrumb.jsx",
      "pagination": "./frontend/src/components/ui/pagination.jsx",
      "drawer": "./frontend/src/components/ui/drawer.jsx"
    }
  },

  "page_blueprints": {
    "landing": {
      "layout": [
        "Header: left logo, center nav (Features/Pricing/FAQ), right language switcher RU/KZ/EN + Login/Register",
        "Hero: left headline + subcopy + primary CTA, right illustration; soft gradient background",
        "How it works (3 steps)",
        "Logos/Trust badges",
        "FAQ + Footer"
      ],
      "hero_classes": "bg-[linear-gradient(135deg,_#F6FAFF_0%,_#F1FBF9_60%,_#FFFFFF_100%)] pt-10 pb-16 sm:pt-16 sm:pb-24",
      "primary_cta_copy": {
        "ru": "Создать контракт",
        "kk": "Келісімшарт құру",
        "en": "Create a contract"
      }
    },
    "dashboard": {
      "topbar": "Search, Filter (status), New Contract button",
      "content": "Left: quick stats; Right: table of contracts",
      "table_columns": ["Title", "Counterparty", "Amount", "Status", "Updated", "Actions"],
      "status_badges": {
        "Signed": "bg-emerald-50 text-emerald-700",
        "Pending": "bg-amber-50 text-amber-700",
        "Sent": "bg-sky-50 text-sky-700",
        "Draft": "bg-slate-100 text-slate-700",
        "Declined": "bg-rose-50 text-rose-700"
      }
    },
    "contract_signing": {
      "flow": [
        "1. Document preview (first page thumbnail + link to full PDF)",
        "2. Verify identity (SMS OTP via input-otp)",
        "3. Confirm signature + success state"
      ],
      "otp_rules": [
        "4–6 digits max",
        "show resend in 30s",
        "fallback voice call link"
      ]
    },
    "contract_details": {
      "sections": [
        "Header with title, status, actions (Download PDF, Send/Resend, Delete)",
        "Timeline of events",
        "Participants with verification status",
        "Document pages preview"
      ]
    },
    "admin": {
      "features": [
        "Users table with search/sort",
        "Contracts overview and filters",
        "System health (queue length, SMS deliverability)"
      ]
    }
  },

  "component_path": {
    "button": "/app/frontend/src/components/ui/button.jsx",
    "input": "/app/frontend/src/components/ui/input.jsx",
    "input_otp": "/app/frontend/src/components/ui/input-otp.jsx",
    "select": "/app/frontend/src/components/ui/select.jsx",
    "calendar": "/app/frontend/src/components/ui/calendar.jsx",
    "badge": "/app/frontend/src/components/ui/badge.jsx",
    "card": "/app/frontend/src/components/ui/card.jsx",
    "table": "/app/frontend/src/components/ui/table.jsx",
    "tabs": "/app/frontend/src/components/ui/tabs.jsx",
    "dialog": "/app/frontend/src/components/ui/dialog.jsx",
    "alert_dialog": "/app/frontend/src/components/ui/alert-dialog.jsx",
    "toast_sonner": "/app/frontend/src/components/ui/sonner.jsx",
    "tooltip": "/app/frontend/src/components/ui/tooltip.jsx",
    "navigation_menu": "/app/frontend/src/components/ui/navigation-menu.jsx",
    "pagination": "/app/frontend/src/components/ui/pagination.jsx"
  },

  "images_urls": [
    {
      "category": "hero",
      "description": "Close-up of signed document for trust",
      "url": "https://images.unsplash.com/photo-1589330694653-ded6df03f754?crop=entropy&cs=srgb&fm=jpg&q=85"
    },
    {
      "category": "feature",
      "description": "Minimal white paper stack on clean desk",
      "url": "https://images.unsplash.com/photo-1606327054581-0a1d4bf42831?crop=entropy&cs=srgb&fm=jpg&q=85"
    },
    {
      "category": "empty_state",
      "description": "Top-down minimal document and keyboard",
      "url": "https://images.pexels.com/photos/6787047/pexels-photo-6787047.jpeg"
    }
  ],

  "motion_and_micro_interactions": {
    "libraries": ["framer-motion"],
    "principles": [
      "0.18–0.3s ease-out for hover/press",
      "Entrance fade+rise 8px on key sections",
      "No universal transition: target specific properties (colors, opacity, background, border)"
    ],
    "examples": [
      "Buttons: subtle scale 0.98 on active state",
      "Cards: elevate on hover with shadow and translate-y-0.5"
    ]
  },

  "icons": {
    "preferred": "lucide-react",
    "fallback": "FontAwesome CDN",
    "rule": "Never use emoji for icons"
  },

  "i18n": {
    "languages": ["ru", "kk", "en"],
    "pattern": "Top-right compact language switcher with codes RU/KZ/EN",
    "a11y": "Each option must include lang attribute and aria-pressed for current",
    "data_test": "data-testid=\"language-switcher\" on trigger; data-testid=\"lang-option-ru\" etc"
  },

  "accessibility": {
    "contrast": "All text WCAG AA; primary on white = 7:1",
    "focus": "Visible 2px ring-primary for all interactive",
    "touch": "tap targets >= 44px",
    "keyboard": "Support tab order and Escape to close dialogs",
    "language_attr": "Set html lang dynamically per current locale"
  },

  "testing_attributes": {
    "rule": "All interactive and critical info elements MUST include data-testid using kebab-case and role-oriented naming",
    "examples": [
      "data-testid=\"login-form-submit-button\"",
      "data-testid=\"create-contract-primary-button\"",
      "data-testid=\"contracts-table-row\"",
      "data-testid=\"otp-verify-button\"",
      "data-testid=\"download-pdf-link\""
    ]
  },

  "code_scaffolds_js": {
    "header_with_language_switcher.jsx": "import { NavigationMenu } from './components/ui/navigation-menu';\nimport { Button } from './components/ui/button';\nimport { ChevronDown } from 'lucide-react';\nimport { useState } from 'react';\n\nexport default function Header() {\n  const [lang, setLang] = useState('ru');\n  const langs = ['ru','kk','en'];\n  return (\n    <header className=\"border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60\">\n      <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between\">\n        <a href=\"/\" className=\"font-semibold tracking-tight text-neutral-900\" data-testid=\"header-logo-link\">Signify KZ</a>\n        <nav className=\"hidden md:flex items-center gap-6\" aria-label=\"Main\">\n          <a href=\"#features\" className=\"text-sm text-neutral-700 hover:text-neutral-900\" data-testid=\"nav-features-link\">Features</a>\n          <a href=\"#pricing\" className=\"text-sm text-neutral-700 hover:text-neutral-900\" data-testid=\"nav-pricing-link\">Pricing</a>\n          <a href=\"#faq\" className=\"text-sm text-neutral-700 hover:text-neutral-900\" data-testid=\"nav-faq-link\">FAQ</a>\n        </nav>\n        <div className=\"flex items-center gap-3\">\n          <div className=\"relative\" data-testid=\"language-switcher\">\n            <button className=\"h-9 px-3 rounded-md border text-sm flex items-center gap-1\" aria-haspopup=\"menu\" aria-label=\"Language\" aria-expanded=\"false\">{lang.toUpperCase()} <ChevronDown className=\"h-4 w-4\" /></button>\n            {/* Implement with shadcn dropdown-menu for accessibility */}\n          </div>\n          <a href=\"/login\" className=\"text-sm text-neutral-700\" data-testid=\"login-link\">Log in</a>\n          <Button className=\"h-9 px-4 bg-primary text-white\" data-testid=\"register-primary-button\">Register</Button>\n        </div>\n      </div>\n    </header>\n  );\n}",
    "dashboard_cards_and_table.jsx": "import { Card } from './components/ui/card';\nimport { Badge } from './components/ui/badge';\nimport { Button } from './components/ui/button';\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';\n\nexport default function Dashboard() {\n  const stats = [\n    {label:'Active Contracts', value:12},\n    {label:'Pending Signatures', value:4},\n    {label:'Signed This Week', value:7}\n  ];\n  const rows = []; // fetch from API\n  return (\n    <div className=\"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8\">\n      <div className=\"grid grid-cols-1 sm:grid-cols-3 gap-4\">\n        {stats.map((s,i)=> (\n          <Card key={i} className=\"p-4\">\n            <div className=\"text-sm text-neutral-500\">{s.label}</div>\n            <div className=\"text-2xl font-semibold\" data-testid=\"dashboard-stat-value\">{s.value}</div>\n          </Card>\n        ))}\n      </div>\n      <div className=\"flex justify-between items-center mt-8\">\n        <h2 className=\"text-lg font-semibold\">Contracts</h2>\n        <Button data-testid=\"create-contract-primary-button\">New Contract</Button>\n      </div>\n      <div className=\"mt-4 border rounded-lg overflow-hidden\">\n        <Table data-testid=\"contracts-table\">\n          <TableHeader>\n            <TableRow>\n              {['Title','Counterparty','Amount','Status','Updated','Actions'].map(h=> (<TableHead key={h}>{h}</TableHead>))}\n            </TableRow>\n          </TableHeader>\n          <TableBody>\n            {rows.length === 0 ? (\n              <TableRow>\n                <TableCell colSpan=\"6\" className=\"text-center text-neutral-500\">No contracts yet</TableCell>\n              </TableRow>\n            ) : rows.map((r)=> (\n              <TableRow key={r.id} data-testid=\"contracts-table-row\">\n                <TableCell>{r.title}</TableCell>\n                <TableCell>{r.party}</TableCell>\n                <TableCell>{r.amount}</TableCell>\n                <TableCell><Badge>{r.status}</Badge></TableCell>\n                <TableCell>{r.updated}</TableCell>\n                <TableCell><Button variant=\"ghost\">Open</Button></TableCell>\n              </TableRow>\n            ))}\n          </TableBody>\n        </Table>\n      </div>\n    </div>\n  );\n}",
    "signing_otp.jsx": "import { InputOTP, InputOTPGroup, InputOTPSlot } from './components/ui/input-otp';\nimport { Button } from './components/ui/button';\n\nexport default function Verify() {\n  return (\n    <div className=\"max-w-md mx-auto p-6\">\n      <h1 className=\"text-2xl font-semibold mb-2\">Verify your phone</h1>\n      <p className=\"text-neutral-600 mb-4\">Enter the 6-digit code we sent via SMS.</p>\n      <InputOTP maxLength={6} data-testid=\"otp-input\">\n        <InputOTPGroup>\n          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}\n        </InputOTPGroup>\n      </InputOTP>\n      <div className=\"mt-4 flex items-center justify-between\">\n        <button className=\"text-sm text-neutral-600 underline\" data-testid=\"resend-otp-link\">Resend in 30s</button>\n        <Button data-testid=\"otp-verify-button\">Verify</Button>\n      </div>\n    </div>\n  );\n}",
    "pdf_view_hint": "Use react-pdf for in-app viewing; always provide a Download PDF fallback link with data-testid=\"download-pdf-link\""
  },

  "libraries_and_install": {
    "commands": [
      "npm i framer-motion lucide-react",
      "npm i recharts",
      "npm i react-pdf"
    ],
    "usage_notes": [
      "Use Framer Motion for section entrances and button hover/press",
      "Use Recharts for admin stats (light sparklines/bars)",
      "Use react-pdf only on details page; lazy-load to reduce bundle size"
    ]
  },

  "images_treatment": {
    "style": "Top-down minimal desk scenes; subtle drop-shadows; never darken critical text areas",
    "parallax": "Apply mild translateY(8–16px) on scroll for hero image only",
    "texture": "Optional 2% grain overlay via CSS background-image for hero, not content"
  },

  
  "instructions_to_main_agent": [
    "1) Add Google Fonts link (Chivo, IBM Plex Sans) in index.html head",
    "2) Set body class font-[\'IBM_Plex_Sans\'] and headings font-[Chivo] via Tailwind utility or base layer",
    "3) Extend Tailwind CSS variables in index.css using provided tokens; keep light background by default",
    "4) Build pages with shadcn/ui components only; no raw HTML widgets for dropdown, calendar, toast",
    "5) Every interactive element MUST have data-testid per convention",
    "6) Implement RU/KZ/EN switcher using shadcn Dropdown; store language in localStorage",
    "7) Enforce gradient restrictions; limit to hero background <20% viewport",
    "8) Use Sonner for toasts from /app/frontend/src/components/ui/sonner.jsx",
    "9) Add skeletons for loading contract lists and PDF preview",
    "10) Implement OTP with input-otp.jsx; include resend timer and voice call fallback link",
    "11) Tables: sticky header on desktop, zebra rows optional (bg-neutral-50)",
    "12) Ensure responsive: mobile-first, then md:grid, lg:grid",
    "13) Add aria-labels and visible focus rings",
    "14) Avoid using .App center styles; rely on Tailwind layout and left-aligned content"
  ]
}


---
General UI UX Design Guidelines  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
