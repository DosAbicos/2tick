# 2tick.kz - Contract Signing Platform PRD

## Original Problem Statement
Build a comprehensive contract signing platform (2tick.kz) with:
- User authentication and management
- Template creation with dynamic placeholder editor
- Contract creation from templates
- PDF upload and signing flow
- Multi-language support (RU, KK, EN)
- SMS/Call/Telegram verification
- Admin panel for user and template management

## Current Status (February 2026)

### Completed Features
- ✅ Full authentication system (JWT)
- ✅ Template management with two-column placeholder editor (Party A / Party B)
- ✅ Contract creation from templates
- ✅ PDF upload/signing flow (unified with template flow)
- ✅ Multi-language support (RU, KK, EN)
- ✅ SMS/Call/Telegram verification
- ✅ Admin panel
- ✅ Dashboard with favorite templates
- ✅ PDF viewer in contract details, signing, and review pages
- ✅ Calculated fields in templates
- ✅ Mobile optimizations for signing page (Step 2 upload, Step 5 verification)
- ✅ **Custom pricing plans**
  - Individual contract template (6,990₸ one-time)
  - Custom contracts package (from 20 contracts, 250₸/contract, discount after 50)
- ✅ **Custom template request system** (user uploads document → admin creates template → assigned to user only)
- ✅ **Public verification page with multi-language support** (/verify/:id)
  - Language switcher (RU/EN/KK)
  - New 2tick logo
  - Fully localized content

### New Pricing Structure
| Plan | Price | Features |
|------|-------|----------|
| FREE | 0₸ | 3 contracts/month |
| START | 5,990₸/month | 20 contracts |
| BUSINESS | 14,990₸/month | 50 contracts |
| Individual Contract | 6,990₸ one-time | Custom template for your business |
| Contract Package | from 5,000₸ | 20+ contracts, never expire |

### Known Issues
1. **P1:** Placeholders with identical labels across languages may not render for Party B
   - Cannot reproduce without specific template/contract ID
   - Waiting for user to provide example

### Backlog
- **P2:** Full dark mode implementation across application

## Technical Architecture

### Stack
- **Frontend:** React, Tailwind CSS, Shadcn/ui, react-router-dom, i18next, react-dnd
- **Backend:** Python 3.11, FastAPI, Beanie (MongoDB ODM), JWT
- **Database:** MongoDB
- **Deployment:** Docker Compose

### Key Files
- `frontend/src/pages/VerifyContractPage.js` - Public contract verification page with multi-language support
- `frontend/src/pages/SignContractPage.js` - Contract signing flow
- `frontend/src/pages/ProfilePage.js` - User profile with custom plans tab
- `frontend/src/pages/NewLandingPage.js` - Landing page with pricing
- `frontend/src/pages/AdminPage.js` - Admin panel with requests management
- `backend/server.py` - All backend logic
- `frontend/public/assets/logo-2tick.png` - New 2tick logo (512x512)

### Key API Endpoints
- `POST /api/contracts/upload-pdf` - Upload PDF contract
- `GET /api/sign/{id}/view-pdf` - View PDF in signing flow
- `GET /api/pricing/calculate-custom?count=N` - Calculate custom contracts price
- `POST /api/custom-template-requests` - Submit custom template request
- `GET /api/admin/custom-template-requests` - Get all requests (admin)
- `PUT /api/admin/custom-template-requests/{id}` - Update request status

### Database Collections
- `users` - User accounts
- `contracts` - All contracts
- `contract_templates` - Templates (with optional `assigned_users` for individual templates)
- `custom_template_requests` - Requests for individual contracts
- `payments` - Payment records
- `subscriptions` - User subscriptions

## Deployment Notes
- Always run `docker compose down` before `docker compose up -d` to prevent Telegram bot conflicts
- User deploys to own VPS using Git and Docker Compose

## Changelog
- **2026-02-24:** Added multi-language support to public verification page (/verify/:id)
  - Added language switcher (RU/EN/KK)
  - Replaced old SVG logo with new 2tick logo image
  - Added translations for all page text in i18n.js
- **2026-02-24:** Added custom pricing plans and individual contract request system
- **2026-02-23:** Mobile optimizations for SignContractPage.js
- **2026-02-23:** Reverted SignContractPage.js mobile optimization (user rejected changes)
- **Previous session:** 
  - Implemented PDF contract flow
  - Fixed PDF display issues
  - Improved placeholder editor UI
  - Fixed dashboard template icons
