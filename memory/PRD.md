# CivicFix (PoN) - Product Requirements Document

## Overview
A civic environmental issue platform that converts complaints into time-stamped evidence trails and crowd-verified resolution.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI + Leaflet + Framer Motion
- **Backend**: FastAPI (Python) with async MongoDB
- **Database**: MongoDB
- **Auth**: JWT-based with email/password
- **Storage**: Local filesystem for images
- **PWA**: Service worker for offline app shell, manifest for installability

## User Personas
1. **Citizen**: Reports issues, supports cases, verifies resolutions
2. **Authority**: Handles assigned cases, marks resolutions
3. **Moderator**: Oversees platform, resolves disputes, manages duplicates

## Core Requirements

### Implemented Features ✅
1. **Landing Page** - Hero section, 3-step explanation, unique features
2. **Authentication** - Login/Register with role selection (Citizen/Authority/Moderator)
3. **Cases Map + Feed** - Interactive map with markers, filterable case list
4. **Report Issue Wizard** - Multi-step: Category → Location → Details
5. **Case Detail Page** - Neglect Score, Timeline, Verification module
6. **Follow-up Evidence** - Add photos/notes to existing cases
7. **Authority Dashboard** - View/manage pending cases, mark resolved
8. **Moderator Dashboard** - Handle disputes, merge duplicates
9. **Proof Pack Page** - Print-ready evidence summary with QR code
10. **PWA Support** - Installable app with manifest and service worker
11. **QR Code Generation** - Scannable QR codes linking to public Proof Pack
12. **Mobile Camera Capture** - Direct camera access for photo uploads
13. **Demo Mode** - Seeded data with reset functionality

### Unique Features ✅
- **Duplicate Merge**: Auto-merges cases within 200m of same category
- **Verification Gating**: "Resolved" requires ≥3 citizen verifications OR moderator override
- **Neglect Score**: Calculated from days open × severity + recurrence bonus
- **Proof Pack Generator**: Shareable evidence summary with timeline and QR code
- **PWA Installability**: App can be installed on mobile/desktop for offline shell
- **Public Proof Pack**: Read-only access for QR code verification without login

## API Endpoints
- POST /api/auth/register, /api/auth/login
- GET /api/cases (with filters), GET /api/cases/:id
- POST /api/cases (create-or-merge), POST /api/cases/:id/followup
- POST /api/cases/:id/support, POST /api/cases/:id/resolve
- POST /api/cases/:id/verify
- GET /api/proof/:caseId (PUBLIC - no auth required)
- GET/POST /api/seed, POST /api/seed/reset

## Demo Credentials
- citizen@demo.com / demo123
- authority@demo.com / demo123
- moderator@demo.com / demo123

## P0/P1/P2 Features Remaining

### P0 (Critical) - COMPLETED ✅
- [x] Core case management
- [x] Verification flow
- [x] Duplicate merge
- [x] Proof Pack generation
- [x] PWA support (manifest, service worker, icons)
- [x] QR code on Proof Pack page
- [x] Mobile camera capture (capture="environment")
- [x] Public read-only Proof Pack access

### P1 (Important) - BACKLOG
- [ ] Email notifications for verification requests
- [ ] Case assignment to specific authorities
- [ ] Reminder system for cases
- [ ] Google OAuth login (optional, user requested skip)

### P2 (Nice to have) - BACKLOG
- [ ] Real-time updates via WebSockets
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard for moderators
- [ ] Social media sharing integration
- [ ] Advanced PWA offline form submission

## Technical Notes
- Service worker caches ONLY static assets (app shell) - API data is NEVER cached
- QR codes use deep green color (#14532d) matching app theme
- Photo inputs use `capture="environment"` for back camera access on mobile
- GPS location detection uses browser geolocation API

---
*Last Updated: January 29, 2026*
