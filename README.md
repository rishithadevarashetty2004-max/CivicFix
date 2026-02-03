# CivicFix (PoN)

A civic environmental issue platform that converts complaints into time-stamped evidence trails and crowd-verified resolution.

## 🎯 What Makes PoN Different

1. **"Resolved" ≠ Verified Resolved** - Authority claims are just the beginning, not the end
2. **Crowd Verification** - Citizens must verify fixes before cases close
3. **Duplicate Merge** - Reports within 200m merge into one stronger case
4. **Proof Pack** - Shareable, print-ready evidence documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB

### Installation

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend  
cd frontend
yarn install
```

### Running

```bash
# Start MongoDB (if not running)
mongod

# Backend (port 8001)
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (port 3000)
cd frontend
yarn start
```

### Auto-Seeding
The app automatically seeds demo data on first run if the database is empty.

## 👤 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Citizen | citizen@demo.com | demo123 |
| Authority | authority@demo.com | demo123 |
| Moderator | moderator@demo.com | demo123 |

## 📋 2-Minute Demo Script

### 1. View Cases (30 sec)
- Go to `/cases` - see active cases on map
- Notice "Days Ignored" prominently displayed
- Click any case to see Neglect Scorecard

### 2. Case Detail (30 sec)
- View the Evidence Timeline
- See Resolution Trust Meter
- Check Verification Status

### 3. Authority Flow (30 sec)
- Login as `authority@demo.com`
- Go to Authority Dashboard
- Mark a case as "Resolved"
- Notice it becomes "Resolved (Pending Verification)"

### 4. Proof Pack (30 sec)
- On any case, click "Generate Proof Pack"
- See print-ready evidence documentation
- Click "Print / Save PDF"

## 🔑 Key Features

### Duplicate Merge (200m radius)
When reporting an issue:
1. System checks existing cases within 200 meters
2. If same category exists: **merge** instead of create
3. User sees confirmation: "Merged into existing case (Xm away)"
4. Original case gets +1 evidence entry and +1 supporter

### Verification Gating Rules
Authority marks "Resolved" → Status becomes "Resolved (Pending Verification)"

To become "Verified Resolved":
- **Option A**: ≥3 citizen verifications with majority "FIXED" votes
- **Option B**: Moderator override

If majority votes "NOT_FIXED":
- Status becomes "Disputed"
- Resolution attempts counter increases
- Case returns to active queue

### Neglect Score Calculation
```
Score = (days_open × severity × status_multiplier) + (resolution_attempts × 15)

Status multipliers:
- Open: 1.0
- Resolved Pending: 1.5  
- Disputed: 2.0
```

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   └── uploads/           # Uploaded images
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth context
│   │   └── lib/           # Utilities
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user

### Cases
- `GET /api/cases` - List cases (with filters)
- `POST /api/cases` - Create or merge case
- `GET /api/cases/:id` - Case details
- `POST /api/cases/:id/followup` - Add evidence
- `POST /api/cases/:id/support` - Toggle support
- `POST /api/cases/:id/resolve` - Mark resolved (authority)
- `POST /api/cases/:id/verify` - Submit verification

### Other
- `GET /api/proof/:id` - Proof pack data
- `POST /api/seed` - Seed demo data
- `POST /api/seed/reset` - Reset & reseed (moderator)

## 🎨 Design System

| Element | Color |
|---------|-------|
| Primary | #14532d (Deep Green) |
| Secondary | #0f766e (Teal) |
| Accent | #f59e0b (Amber) |
| Danger | #dc2626 (Red) |
| Background | #f8fafc (Off-white) |

### Status Colors
- Open: Amber
- In Progress: Blue
- Resolved (Pending): Yellow
- Verified Resolved: Green
- Disputed: Red

## 🧪 Technologies

- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Leaflet, Framer Motion
- **Backend**: FastAPI, Motor (async MongoDB)
- **Auth**: JWT with bcrypt
- **Maps**: Leaflet + OpenStreetMap (no API keys required)

## 📝 License

MIT - Built for hackathon demonstration purposes.

---

**CivicFix** - Stop "Resolved" Without Fix
