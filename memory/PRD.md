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

### Known Issues
1. **P0:** Mobile UX on signing page requires excessive scrolling
   - Previous optimization attempt was rejected and reverted
   - Needs new approach with user approval

2. **P1:** Placeholders with identical labels across languages may not render for Party B
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
- `frontend/src/pages/SignContractPage.js` - Contract signing flow (2031 lines)
- `frontend/src/pages/admin/EditTemplatePage.js` - Template editor
- `frontend/src/pages/DashboardPage.js` - User dashboard
- `frontend/src/pages/UploadPdfContractPage.js` - PDF contract upload
- `backend/src/routes/contracts.py` - Contract API endpoints
- `backend/src/models.py` - Database models

### Key API Endpoints
- `POST /api/contracts/upload-pdf` - Upload PDF contract
- `GET /api/sign/{id}/view-pdf` - View PDF in signing flow
- `POST /api/sign/{id}/update-signer-info` - Update signer information
- `POST /api/sign/{id}/verify-otp` - Verify OTP code

## Deployment Notes
- Always run `docker compose down` before `docker compose up -d` to prevent Telegram bot conflicts
- User deploys to own VPS using Git and Docker Compose

## Changelog
- **2026-02-23:** Reverted SignContractPage.js mobile optimization (user rejected changes)
- **Previous session:** 
  - Implemented PDF contract flow
  - Fixed PDF display issues
  - Improved placeholder editor UI
  - Fixed dashboard template icons
