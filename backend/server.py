from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Header
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import aiofiles
import math
import random
from datetime import datetime, timedelta
from collections import defaultdict
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'pon-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,   # safe; you might later use cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Placeholder images for demo
PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop",  # garbage
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",  # street
    "https://images.unsplash.com/photo-1567789884554-0b844b597180?w=400&h=300&fit=crop",  # urban
    "https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=400&h=300&fit=crop",  # road
    "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?w=400&h=300&fit=crop",  # drain
]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["citizen", "authority", "moderator"] = "citizen"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    createdAt: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class CaseCreate(BaseModel):
    title: str
    category: str
    description: str
    severity: int = Field(ge=1, le=5)
    lat: float
    lng: float
    photoUrl: Optional[str] = None
    harmTypes: List[str] = []

class CaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    description: str
    status: str
    severity: int
    lat: float
    lng: float
    neglectScore: float
    supportersCount: int
    submissionsCount: int
    daysIgnored: int
    createdAt: str
    updatedAt: str
    firstReportedAt: str

class SubmissionCreate(BaseModel):
    note: str
    photoUrl: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class VerificationCreate(BaseModel):
    vote: Literal["FIXED", "NOT_FIXED", "TEMPORARY", "PARTIAL"]

class ResolutionCreate(BaseModel):
    note: str
    photoUrl: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    async def role_checker(authorization: str = Header(None)):
        user = await get_current_user(authorization)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ==================== HELPERS ====================

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def calculate_neglect_score(case: dict) -> float:
    """Calculate neglect score based on days, severity, and recurrence"""
    first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
    days_open = (datetime.now(timezone.utc) - first_reported).days
    severity = case.get("severity", 3)
    recurrence_bonus = case.get("resolutionAttempts", 0) * 15
    
    # Status multipliers
    status_multiplier = 1.0
    if case.get("status") == "resolved_pending":
        status_multiplier = 1.5
    elif case.get("status") == "disputed":
        status_multiplier = 2.0
    
    return round((days_open * severity * status_multiplier) + recurrence_bonus, 1)

async def update_case_stats(case_id: str):
    """Update case statistics"""
    supporters_count = await db.supports.count_documents({"caseId": case_id})
    submissions_count = await db.submissions.count_documents({"caseId": case_id})
    
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if case:
        neglect_score = calculate_neglect_score(case)
        first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
        days_ignored = (datetime.now(timezone.utc) - first_reported).days
        
        await db.cases.update_one(
            {"id": case_id},
            {"$set": {
                "supportersCount": supporters_count,
                "submissionsCount": submissions_count,
                "neglectScore": neglect_score,
                "daysIgnored": days_ignored,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )

async def check_and_update_verification_status(case_id: str):
    """Check verifications and update case status according to rules"""
    verifications = await db.verifications.find({"caseId": case_id}).to_list(100)
    
    if len(verifications) == 0:
        return
    
    # Check for moderator verification (override)
    mod_verifications = [v for v in verifications if v.get("userRole") == "moderator"]
    if mod_verifications:
        latest_mod = mod_verifications[-1]
        if latest_mod["vote"] == "FIXED":
            await db.cases.update_one(
                {"id": case_id},
                {"$set": {"status": "verified_resolved", "updatedAt": datetime.now(timezone.utc).isoformat()}}
            )
            return
        elif latest_mod["vote"] == "NOT_FIXED":
            # Moderator says not fixed -> disputed, increment resolution attempts
            case = await db.cases.find_one({"id": case_id}, {"_id": 0})
            attempts = case.get("resolutionAttempts", 0) + 1
            await db.cases.update_one(
                {"id": case_id},
                {"$set": {
                    "status": "disputed",
                    "resolutionAttempts": attempts,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )
            return
    
    # Need at least 3 citizen verifications
    citizen_verifications = [v for v in verifications if v.get("userRole") != "moderator"]
    if len(citizen_verifications) >= 3:
        votes = {"FIXED": 0, "NOT_FIXED": 0, "TEMPORARY": 0, "PARTIAL": 0}
        for v in citizen_verifications:
            votes[v["vote"]] += 1
        
        # Majority logic
        total = len(citizen_verifications)
        if votes["FIXED"] > total / 2:
            await db.cases.update_one(
                {"id": case_id},
                {"$set": {"status": "verified_resolved", "updatedAt": datetime.now(timezone.utc).isoformat()}}
            )
        elif votes["NOT_FIXED"] > total / 2:
            # Majority says not fixed -> disputed, increment resolution attempts
            case = await db.cases.find_one({"id": case_id}, {"_id": 0})
            attempts = case.get("resolutionAttempts", 0) + 1
            await db.cases.update_one(
                {"id": case_id},
                {"$set": {
                    "status": "disputed",
                    "resolutionAttempts": attempts,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )
        elif votes["TEMPORARY"] > total / 2 or votes["PARTIAL"] > total / 2:
            case = await db.cases.find_one({"id": case_id}, {"_id": 0})
            attempts = case.get("resolutionAttempts", 0) + 1
            await db.cases.update_one(
                {"id": case_id},
                {"$set": {
                    "status": "in_progress",
                    "resolutionAttempts": attempts,
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "name": user_data.name,
        "email": user_data.email,
        "passwordHash": hash_password(user_data.password),
        "role": user_data.role,
        "createdAt": now
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user_data.email, user_data.role)
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user_id,
            name=user_data.name,
            email=user_data.email,
            role=user_data.role,
            createdAt=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            role=user["role"],
            createdAt=user["createdAt"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        createdAt=user["createdAt"]
    )

# ==================== FILE UPLOAD ====================

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    return {"url": f"/uploads/{filename}"}

# ==================== CASE ROUTES ====================

CATEGORIES = [
    "garbage_dump",
    "sewage_leak",
    "dead_animal",
    "dustbin_overflow",
    "road_damage",
    "broken_streetlight",
    "illegal_construction",
    "water_contamination",
    "air_pollution",
    "noise_pollution"
]

CATEGORY_LABELS = {
    "garbage_dump": "Garbage Dump",
    "sewage_leak": "Sewage Leak",
    "dead_animal": "Dead Animal",
    "dustbin_overflow": "Dustbin Overflow",
    "road_damage": "Road Damage",
    "broken_streetlight": "Broken Streetlight",
    "illegal_construction": "Illegal Construction",
    "water_contamination": "Water Contamination",
    "air_pollution": "Air Pollution",
    "noise_pollution": "Noise Pollution"
}

@api_router.get("/categories")
async def get_categories():
    return {"categories": CATEGORIES, "labels": CATEGORY_LABELS}

@api_router.post("/cases")
async def create_case(case_data: CaseCreate, user: dict = Depends(get_current_user)):
    """Create a new case or merge into existing nearby case"""
    
    # Check for duplicate within 200m of same category
    existing_cases = await db.cases.find({
        "category": case_data.category,
        "status": {"$nin": ["verified_resolved"]}
    }, {"_id": 0}).to_list(1000)
    
    merged_case = None
    merge_distance = None
    for existing in existing_cases:
        distance = calculate_distance(
            case_data.lat, case_data.lng,
            existing["lat"], existing["lng"]
        )
        if distance <= 200:  # 200 meters
            merged_case = existing
            merge_distance = round(distance, 1)
            break
    
    now = datetime.now(timezone.utc).isoformat()
    
    if merged_case:
        # Add as new submission to existing case
        submission_id = str(uuid.uuid4())
        submission_doc = {
            "id": submission_id,
            "caseId": merged_case["id"],
            "userId": user["id"],
            "userName": user["name"],
            "type": "MERGED_REPORT",
            "photoUrl": case_data.photoUrl,
            "note": case_data.description,
            "lat": case_data.lat,
            "lng": case_data.lng,
            "mergeDistance": merge_distance,
            "originalTitle": case_data.title,
            "createdAt": now
        }
        await db.submissions.insert_one(submission_doc)
        
        # Record merge history
        await db.merge_history.insert_one({
            "id": str(uuid.uuid4()),
            "toCaseId": merged_case["id"],
            "mergedBy": user["id"],
            "originalTitle": case_data.title,
            "distance": merge_distance,
            "createdAt": now
        })
        
        # Add support if not already supporter
        existing_support = await db.supports.find_one({
            "caseId": merged_case["id"],
            "userId": user["id"]
        })
        if not existing_support:
            await db.supports.insert_one({
                "id": str(uuid.uuid4()),
                "caseId": merged_case["id"],
                "userId": user["id"],
                "createdAt": now
            })
        
        await update_case_stats(merged_case["id"])
        
        updated_case = await db.cases.find_one({"id": merged_case["id"]}, {"_id": 0})
        return {
            "case": updated_case, 
            "merged": True, 
            "mergeDistance": merge_distance,
            "message": f"Merged into existing case ({merge_distance}m away) to prevent duplicates"
        }
    
    # Create new case
    case_id = str(uuid.uuid4())
    case_doc = {
        "id": case_id,
        "title": case_data.title,
        "category": case_data.category,
        "description": case_data.description,
        "status": "open",
        "severity": case_data.severity,
        "lat": case_data.lat,
        "lng": case_data.lng,
        "harmTypes": case_data.harmTypes,
        "neglectScore": 0,
        "supportersCount": 1,
        "submissionsCount": 1,
        "daysIgnored": 0,
        "resolutionAttempts": 0,
        "createdAt": now,
        "updatedAt": now,
        "firstReportedAt": now,
        "reporterId": user["id"],
        "reporterName": user["name"]
    }
    
    await db.cases.insert_one(case_doc)
    
    # Create initial submission
    submission_doc = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "userName": user["name"],
        "type": "REPORT",
        "photoUrl": case_data.photoUrl,
        "note": case_data.description,
        "lat": case_data.lat,
        "lng": case_data.lng,
        "createdAt": now
    }
    await db.submissions.insert_one(submission_doc)
    
    # Add reporter as first supporter
    await db.supports.insert_one({
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "createdAt": now
    })
    
    # Remove MongoDB _id before returning
    case_doc.pop("_id", None)
    return {"case": case_doc, "merged": False}

@api_router.get("/cases")
async def get_cases(
    category: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[int] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius: Optional[float] = None,  # in km
    sort: str = "neglectScore"
):
    """Get all cases with filters"""
    query = {}
    
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if severity:
        query["severity"] = {"$gte": severity}
    
    cases = await db.cases.find(query, {"_id": 0}).to_list(1000)
    
    # Filter by radius if provided
    if lat is not None and lng is not None and radius:
        cases = [
            c for c in cases 
            if calculate_distance(lat, lng, c["lat"], c["lng"]) <= radius * 1000
        ]
    
    # Update neglect scores
    for case in cases:
        case["neglectScore"] = calculate_neglect_score(case)
        first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
        case["daysIgnored"] = (datetime.now(timezone.utc) - first_reported).days
    
    # Sort
    if sort == "neglectScore":
        cases.sort(key=lambda x: x["neglectScore"], reverse=True)
    elif sort == "date":
        cases.sort(key=lambda x: x["createdAt"], reverse=True)
    elif sort == "supporters":
        cases.sort(key=lambda x: x["supportersCount"], reverse=True)
    
    return {"cases": cases}

@api_router.get("/cases/{case_id}")
async def get_case(case_id: str):
    """Get a single case with all details"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Update stats
    await update_case_stats(case_id)
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    
    # Get submissions (timeline)
    submissions = await db.submissions.find(
        {"caseId": case_id}, 
        {"_id": 0}
    ).sort("createdAt", 1).to_list(100)
    
    # Get verifications
    verifications = await db.verifications.find(
        {"caseId": case_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get supporters
    supporters = await db.supports.find(
        {"caseId": case_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get merge history
    merge_history = await db.merge_history.find(
        {"toCaseId": case_id},
        {"_id": 0}
    ).to_list(50)
    
    # Verification summary
    verification_counts = {"FIXED": 0, "NOT_FIXED": 0, "TEMPORARY": 0, "PARTIAL": 0}
    for v in verifications:
        verification_counts[v["vote"]] += 1
    
    # Trust meter data
    has_authority_resolution = any(s["type"] == "AUTH_RESOLUTION" for s in submissions)
    citizen_verifications = [v for v in verifications if v.get("userRole") != "moderator"]
    has_citizen_verification = len(citizen_verifications) >= 3
    has_conflicting_votes = (verification_counts["FIXED"] > 0 and verification_counts["NOT_FIXED"] > 0)
    
    trust_meter = {
        "authorityMarkedResolved": has_authority_resolution,
        "citizenVerificationComplete": has_citizen_verification,
        "conflictingVotesDetected": has_conflicting_votes,
        "totalVerifications": len(verifications),
        "requiredVerifications": 3
    }
    
    return {
        "case": case,
        "submissions": submissions,
        "verifications": verifications,
        "verificationCounts": verification_counts,
        "supporters": supporters,
        "mergeHistory": merge_history,
        "trustMeter": trust_meter
    }

@api_router.post("/cases/{case_id}/followup")
async def add_followup(case_id: str, data: SubmissionCreate, user: dict = Depends(get_current_user)):
    """Add follow-up evidence to a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    submission_doc = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "userName": user["name"],
        "type": "FOLLOWUP",
        "photoUrl": data.photoUrl,
        "note": data.note,
        "lat": data.lat,
        "lng": data.lng,
        "createdAt": now
    }
    
    await db.submissions.insert_one(submission_doc)
    await update_case_stats(case_id)
    
    # Remove MongoDB _id before returning
    submission_doc.pop("_id", None)
    return {"submission": submission_doc}

@api_router.post("/cases/{case_id}/support")
async def support_case(case_id: str, user: dict = Depends(get_current_user)):
    """Support/Me-too a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Check if already supporting
    existing = await db.supports.find_one({
        "caseId": case_id,
        "userId": user["id"]
    })
    
    if existing:
        # Remove support (toggle)
        await db.supports.delete_one({"id": existing["id"]})
        await update_case_stats(case_id)
        return {"supported": False}
    
    # Add support
    support_doc = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.supports.insert_one(support_doc)
    await update_case_stats(case_id)
    
    return {"supported": True}

@api_router.post("/cases/{case_id}/resolve")
async def resolve_case(case_id: str, data: ResolutionCreate, user: dict = Depends(require_role("authority", "moderator"))):
    """Authority marks case as resolved (pending verification)"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Add resolution submission
    submission_doc = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "userName": user["name"],
        "userRole": user["role"],
        "type": "AUTH_RESOLUTION",
        "photoUrl": data.photoUrl,
        "note": data.note,
        "createdAt": now
    }
    await db.submissions.insert_one(submission_doc)
    
    # Update status to pending verification (NOT directly resolved!)
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {
            "status": "resolved_pending",
            "resolvedAt": now,
            "resolvedBy": user["id"],
            "updatedAt": now
        }}
    )
    
    return {"message": "Case marked as Resolved (Pending Verification). Citizens must verify."}

@api_router.post("/cases/{case_id}/verify")
async def verify_case(case_id: str, data: VerificationCreate, user: dict = Depends(get_current_user)):
    """Citizen/Moderator verification of resolution"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case["status"] not in ["resolved_pending", "disputed"]:
        raise HTTPException(status_code=400, detail="Case is not pending verification")
    
    # Check if user already verified (moderators can override)
    existing = await db.verifications.find_one({
        "caseId": case_id,
        "userId": user["id"]
    })
    
    if existing and user["role"] != "moderator":
        raise HTTPException(status_code=400, detail="You have already verified this case")
    
    now = datetime.now(timezone.utc).isoformat()
    
    verification_doc = {
        "id": str(uuid.uuid4()),
        "caseId": case_id,
        "userId": user["id"],
        "userName": user["name"],
        "userRole": user["role"],
        "vote": data.vote,
        "createdAt": now
    }
    
    await db.verifications.insert_one(verification_doc)
    
    # Check and update verification status
    await check_and_update_verification_status(case_id)
    
    updated_case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    
    # Remove MongoDB _id before returning
    verification_doc.pop("_id", None)
    return {"verification": verification_doc, "newStatus": updated_case["status"]}

@api_router.post("/cases/{case_id}/status")
async def update_status(case_id: str, status: str = Form(...), user: dict = Depends(require_role("authority", "moderator"))):
    """Update case status (authority/moderator)"""
    valid_statuses = ["open", "in_progress", "resolved_pending", "verified_resolved", "disputed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    await db.cases.update_one(
        {"id": case_id},
        {"$set": {"status": status, "updatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Status updated"}

# ==================== PROOF PACK ====================

@api_router.get("/proof/{case_id}")
async def get_proof_pack(case_id: str):
    """Get compiled proof pack data for a case"""
    case = await db.cases.find_one({"id": case_id}, {"_id": 0})
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    submissions = await db.submissions.find(
        {"caseId": case_id},
        {"_id": 0}
    ).sort("createdAt", 1).to_list(100)
    
    verifications = await db.verifications.find(
        {"caseId": case_id},
        {"_id": 0}
    ).to_list(100)
    
    supporters = await db.supports.count_documents({"caseId": case_id})
    
    merge_history = await db.merge_history.find(
        {"toCaseId": case_id},
        {"_id": 0}
    ).to_list(50)
    
    # Verification summary
    verification_counts = {"FIXED": 0, "NOT_FIXED": 0, "TEMPORARY": 0, "PARTIAL": 0}
    for v in verifications:
        verification_counts[v["vote"]] += 1
    
    # Update neglect score
    case["neglectScore"] = calculate_neglect_score(case)
    first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
    case["daysIgnored"] = (datetime.now(timezone.utc) - first_reported).days
    
    return {
        "case": case,
        "submissions": submissions,
        "verifications": verifications,
        "verificationCounts": verification_counts,
        "supportersCount": supporters,
        "mergeHistory": merge_history,
        "generatedAt": datetime.now(timezone.utc).isoformat()
    }

# ==================== AUTHORITY DASHBOARD ====================

@api_router.get("/authority/cases")
async def get_authority_cases(user: dict = Depends(require_role("authority", "moderator"))):
    """Get cases for authority dashboard"""
    cases = await db.cases.find(
        {"status": {"$in": ["open", "in_progress", "disputed"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Sort by neglect score
    for case in cases:
        case["neglectScore"] = calculate_neglect_score(case)
        first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
        case["daysIgnored"] = (datetime.now(timezone.utc) - first_reported).days
    cases.sort(key=lambda x: x["neglectScore"], reverse=True)
    
    return {"cases": cases}

# ==================== MODERATOR DASHBOARD ====================

@api_router.get("/moderator/cases")
async def get_moderator_cases(user: dict = Depends(require_role("moderator"))):
    """Get all cases for moderator"""
    cases = await db.cases.find({}, {"_id": 0}).to_list(1000)
    
    # Update stats
    for case in cases:
        case["neglectScore"] = calculate_neglect_score(case)
        first_reported = datetime.fromisoformat(case["firstReportedAt"].replace("Z", "+00:00"))
        case["daysIgnored"] = (datetime.now(timezone.utc) - first_reported).days
    
    disputed = [c for c in cases if c["status"] == "disputed"]
    pending = [c for c in cases if c["status"] == "resolved_pending"]
    
    return {
        "disputed": disputed,
        "pendingVerification": pending,
        "all": cases
    }

@api_router.post("/moderator/merge")
async def merge_cases(from_case_id: str = Form(...), to_case_id: str = Form(...), user: dict = Depends(require_role("moderator"))):
    """Merge one case into another"""
    from_case = await db.cases.find_one({"id": from_case_id}, {"_id": 0})
    to_case = await db.cases.find_one({"id": to_case_id}, {"_id": 0})
    
    if not from_case or not to_case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Move submissions
    await db.submissions.update_many(
        {"caseId": from_case_id},
        {"$set": {"caseId": to_case_id}}
    )
    
    # Move supports
    await db.supports.update_many(
        {"caseId": from_case_id},
        {"$set": {"caseId": to_case_id}}
    )
    
    # Record merge
    await db.merge_history.insert_one({
        "id": str(uuid.uuid4()),
        "fromCaseId": from_case_id,
        "toCaseId": to_case_id,
        "mergedBy": user["id"],
        "originalTitle": from_case["title"],
        "createdAt": datetime.now(timezone.utc).isoformat()
    })
    
    # Delete old case
    await db.cases.delete_one({"id": from_case_id})
    
    # Update stats
    await update_case_stats(to_case_id)
    
    return {"message": "Cases merged successfully"}

# ==================== SEED DATA ====================

@api_router.get("/seed/status")
async def get_seed_status():
    """Check if demo data exists"""
    user_count = await db.users.count_documents({})
    case_count = await db.cases.count_documents({})
    return {"hasData": user_count > 0 and case_count > 0, "users": user_count, "cases": case_count}

@api_router.post("/seed")
async def seed_data():
    """Create large, realistic multi-city demo seed data (Delhi + Hyderabad + Mumbai + Bangalore + Kolkata)"""
    now = datetime.now(timezone.utc)

    # ---------- Helpers ----------
    def iso(dt):
        return dt.isoformat()

    def rand_dt(days_ago_min, days_ago_max):
        days_ago = random.randint(days_ago_min, days_ago_max)
        hrs = random.randint(0, 23)
        mins = random.randint(0, 59)
        return now - timedelta(days=days_ago, hours=hrs, minutes=mins)

    def clamp(v, lo, hi):
        return max(lo, min(hi, v))

    def compute_neglect_score(days_ignored, severity, supporters_count, submissions_count, resolution_attempts):
        # Simple but "real-looking" score: time + severity + crowd pressure + repeated failed attempts
        score = (days_ignored * 2.8) + (severity * 9.5) + (supporters_count * 0.35) + (submissions_count * 0.8) + (resolution_attempts * 12)
        return round(clamp(score, 0, 100), 1)

    # Categories already used in your frontend constants
    CATS = [
        "garbage_dump", "sewage_leak", "dead_animal", "dustbin_overflow", "road_damage",
        "broken_streetlight", "illegal_construction", "water_contamination",
        "air_pollution", "noise_pollution"
    ]

    HARM_BY_CAT = {
        "garbage_dump": ["health_hazard", "odor", "pests"],
        "sewage_leak": ["health_hazard", "water_contamination", "odor"],
        "dead_animal": ["health_hazard", "odor"],
        "dustbin_overflow": ["health_hazard", "pests", "odor"],
        "road_damage": ["traffic_obstruction"],
        "broken_streetlight": ["traffic_obstruction"],
        "illegal_construction": ["traffic_obstruction", "health_hazard"],
        "water_contamination": ["health_hazard", "water_contamination"],
        "air_pollution": ["health_hazard"],
        "noise_pollution": ["health_hazard"],
    }

    # City -> sample hotspots (lat/lng + area/ward/locality)
    CITY_HOTSPOTS = {
        "Delhi": [
            {"lat": 28.6139, "lng": 77.2090, "area": "Connaught Place", "ward": "NDMC", "locality": "CP"},
            {"lat": 28.6229, "lng": 77.2190, "area": "Janpath", "ward": "NDMC", "locality": "Janpath"},
            {"lat": 28.6339, "lng": 77.2290, "area": "India Gate", "ward": "New Delhi", "locality": "Central Delhi"},
            {"lat": 28.5494, "lng": 77.2001, "area": "Hauz Khas", "ward": "South Delhi", "locality": "HK"},
            {"lat": 28.6862, "lng": 77.2217, "area": "Civil Lines", "ward": "North Delhi", "locality": "Civil Lines"},
        ],
        "Hyderabad": [
            {"lat": 17.3850, "lng": 78.4867, "area": "Abids", "ward": "Khairatabad", "locality": "Abids"},
            {"lat": 17.4483, "lng": 78.3915, "area": "Hitech City", "ward": "Serilingampally", "locality": "Hitech City"},
            {"lat": 17.3616, "lng": 78.4747, "area": "Charminar", "ward": "Old City", "locality": "Charminar"},
            {"lat": 17.4065, "lng": 78.4772, "area": "RTC X Roads", "ward": "Musheerabad", "locality": "RTC X Roads"},
            {"lat": 17.4948, "lng": 78.3996, "area": "Kompally", "ward": "Medchal", "locality": "Kompally"},
        ],
        "Mumbai": [
            {"lat": 19.0760, "lng": 72.8777, "area": "Dadar", "ward": "G/N", "locality": "Dadar"},
            {"lat": 19.0176, "lng": 72.8562, "area": "Bandra", "ward": "H/W", "locality": "Bandra"},
            {"lat": 18.9388, "lng": 72.8354, "area": "Colaba", "ward": "A", "locality": "Colaba"},
            {"lat": 19.1136, "lng": 72.8697, "area": "Andheri", "ward": "K/E", "locality": "Andheri"},
            {"lat": 19.2183, "lng": 72.9781, "area": "Thane", "ward": "TMC", "locality": "Thane"},
        ],
        "Bangalore": [
            {"lat": 12.9716, "lng": 77.5946, "area": "MG Road", "ward": "Shanthinagar", "locality": "CBD"},
            {"lat": 12.9352, "lng": 77.6245, "area": "Koramangala", "ward": "Koramangala", "locality": "Kormangala"},
            {"lat": 12.9279, "lng": 77.6271, "area": "HSR Layout", "ward": "HSR", "locality": "HSR"},
            {"lat": 12.9763, "lng": 77.6033, "area": "Indiranagar", "ward": "Indiranagar", "locality": "Indiranagar"},
            {"lat": 13.0358, "lng": 77.5970, "area": "Hebbal", "ward": "Hebbal", "locality": "Hebbal"},
        ],
        "Kolkata": [
            {"lat": 22.5726, "lng": 88.3639, "area": "Esplanade", "ward": "Borough I", "locality": "Central"},
            {"lat": 22.5677, "lng": 88.3476, "area": "Park Street", "ward": "Borough I", "locality": "Park Street"},
            {"lat": 22.5867, "lng": 88.4170, "area": "Salt Lake", "ward": "Bidhannagar", "locality": "Salt Lake"},
            {"lat": 22.5126, "lng": 88.3615, "area": "Tollygunge", "ward": "Borough VIII", "locality": "Tollygunge"},
            {"lat": 22.5958, "lng": 88.2636, "area": "Howrah", "ward": "Howrah", "locality": "Howrah"},
        ],
    }

    # Titles/descriptions templates
    TITLE_TEMPLATES = {
        "garbage_dump": [
            "Garbage pile-up near {area} market",
            "Overflowing garbage dump beside {area} park",
            "Uncollected waste on main lane of {area}",
        ],
        "sewage_leak": [
            "Sewage overflow causing foul smell in {area}",
            "Drain blockage leading to sewage on road at {area}",
            "Sewage leak near residential block in {area}",
        ],
        "dead_animal": [
            "Dead animal left unattended near {area}",
            "Stray animal carcass on roadside at {area}",
            "Health hazard due to dead animal near {area} lane",
        ],
        "dustbin_overflow": [
            "Community dustbin overflowing in {area}",
            "Public dustbin not cleared for days at {area}",
            "Trash scattered due to overflowing bin at {area}",
        ],
        "road_damage": [
            "Deep potholes near {area} junction",
            "Road cracks and potholes worsening at {area}",
            "Dangerous road damage affecting traffic in {area}",
        ],
        "broken_streetlight": [
            "Streetlights not working in {area} stretch",
            "Dark patch due to broken lights near {area}",
            "Multiple streetlights dead on {area} road",
        ],
        "illegal_construction": [
            "Suspected illegal construction blocking footpath at {area}",
            "Unauthorized construction causing congestion in {area}",
            "Illegal extension affecting safety near {area}",
        ],
        "water_contamination": [
            "Dirty water supply reported in {area}",
            "Possible water contamination in {area} pipeline",
            "Residents report foul water in {area}",
        ],
        "air_pollution": [
            "Excessive dust and smoke reported near {area}",
            "Air pollution spike due to burning waste at {area}",
            "Construction dust affecting {area} residents",
        ],
        "noise_pollution": [
            "Noise pollution due to late-night activities in {area}",
            "Loudspeakers causing disturbance in {area}",
            "Continuous honking/noise complaints in {area}",
        ],
    }

    DESC_TEMPLATES = [
        "Residents have reported this issue multiple times. It is impacting daily life and public safety.",
        "The situation has worsened over time and needs immediate action from authorities.",
        "Local people are facing inconvenience and possible health hazards. Please take urgent steps.",
        "The issue is affecting commuters and nearby homes. Requesting prompt resolution.",
    ]

    # Status distribution (tweak as you like)
    STATUSES = [
        ("open", 0.30),
        ("in_progress", 0.18),
        ("resolved_pending", 0.26),
        ("verified_resolved", 0.18),
        ("disputed", 0.08),
    ]

    def pick_status():
        r = random.random()
        acc = 0
        for st, p in STATUSES:
            acc += p
            if r <= acc:
                return st
        return "open"

    # ---------- 0) Clear existing seed data ----------
    # Keep your original demo emails but also wipe previous multi-city seeds
    await db.users.delete_many({
        "email": {"$in": ["citizen@demo.com", "authority@demo.com", "moderator@demo.com"]}
    })

    await db.cases.delete_many({"id": {"$regex": "^(case-demo-|case-seed-)"}})
    await db.submissions.delete_many({"caseId": {"$regex": "^(case-demo-|case-seed-)"}})
    await db.supports.delete_many({"caseId": {"$regex": "^(case-demo-|case-seed-)"}})
    await db.verifications.delete_many({"caseId": {"$regex": "^(case-demo-|case-seed-)"}})

    # ---------- 1) Users ----------
    demo_users = [
        {"id": "user-citizen-1", "name": "Priya Sharma", "email": "citizen@demo.com", "passwordHash": hash_password("demo123"), "role": "citizen", "createdAt": iso(now)},
        {"id": "user-authority-1", "name": "Rahul Kumar", "email": "authority@demo.com", "passwordHash": hash_password("demo123"), "role": "authority", "createdAt": iso(now)},
        {"id": "user-moderator-1", "name": "Admin User", "email": "moderator@demo.com", "passwordHash": hash_password("demo123"), "role": "moderator", "createdAt": iso(now)},
    ]
    for u in demo_users:
        await db.users.insert_one(u)

    # Add additional citizens for realism (not needed for login, but improves seed realism)
    first_names = ["Amit", "Sneha", "Ravi", "Neha", "Arjun", "Kiran", "Meera", "Vikram", "Ananya", "Sahil", "Rohit", "Pooja"]
    last_names = ["Patel", "Gupta", "Reddy", "Sharma", "Khan", "Das", "Iyer", "Naidu", "Singh", "Nair", "Chatterjee"]
    extra_citizens = []
    for i in range(1, 26):
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        extra_citizens.append({
            "id": f"user-citizen-x{i}",
            "name": name,
            "email": f"citizen{i}@seed.demo",
            "passwordHash": hash_password("demo123"),
            "role": "citizen",
            "createdAt": iso(rand_dt(5, 60)),
        })
    await db.users.insert_many(extra_citizens)

    citizen_pool = [{"id": "user-citizen-1", "name": "Priya Sharma"}] + [{"id": u["id"], "name": u["name"]} for u in extra_citizens]

    # ---------- 2) Create many cases ----------
    TOTAL_CASES = 160  # increase if you want
    city_names = list(CITY_HOTSPOTS.keys())

    cases_to_insert = []
    submissions_to_insert = []
    supports_to_insert = []
    verifications_to_insert = []

    # If your project already defines PLACEHOLDER_IMAGES, keep using it.
    # If not, safe fallback list:
    placeholder_images = globals().get("PLACEHOLDER_IMAGES", [
        "/static/placeholder1.jpg", "/static/placeholder2.jpg", "/static/placeholder3.jpg", "/static/placeholder4.jpg"
    ])

    for idx in range(1, TOTAL_CASES + 1):
        city = random.choice(city_names)
        hotspot = random.choice(CITY_HOTSPOTS[city])
        cat = random.choice(CATS)
        status = pick_status()

        severity = random.randint(2, 5)
        days_ignored = random.randint(1, 45)

        # For statuses, tune recency: verified/resolved tend to be more recent
        created_at = rand_dt(7, 60) if status in ["open", "in_progress"] else rand_dt(3, 45)
        updated_at = created_at + timedelta(days=random.randint(0, 10), hours=random.randint(0, 12))

        # counts
        supporters_count = random.randint(3, 90)
        submissions_count = random.randint(2, 12)

        resolution_attempts = 0
        resolved_at = None

        if status == "disputed":
            resolution_attempts = random.randint(1, 3)
            resolved_at = updated_at - timedelta(days=random.randint(0, 4))
        elif status in ["resolved_pending", "verified_resolved"]:
            resolution_attempts = random.randint(0, 2)
            resolved_at = updated_at - timedelta(days=random.randint(0, 3))

        neglect_score = compute_neglect_score(
            days_ignored=days_ignored,
            severity=severity,
            supporters_count=supporters_count,
            submissions_count=submissions_count,
            resolution_attempts=resolution_attempts
        )

        reporter = random.choice(citizen_pool)

        title = random.choice(TITLE_TEMPLATES[cat]).format(area=hotspot["area"])
        description = random.choice(DESC_TEMPLATES)

        case_id = f"case-seed-{idx:04d}"

        case_doc = {
            "id": case_id,  # IMPORTANT: your app uses this string id
            "title": title,
            "category": cat,
            "description": description,
            "status": status,
            "severity": severity,
            "lat": hotspot["lat"] + random.uniform(-0.0022, 0.0022),
            "lng": hotspot["lng"] + random.uniform(-0.0022, 0.0022),
            "harmTypes": HARM_BY_CAT.get(cat, []),
            "neglectScore": neglect_score,
            "supportersCount": supporters_count,
            "submissionsCount": submissions_count,
            "daysIgnored": days_ignored,
            "resolutionAttempts": resolution_attempts,
            "createdAt": iso(created_at),
            "updatedAt": iso(updated_at),
            "firstReportedAt": iso(created_at),
            "reporterId": reporter["id"],
            "reporterName": reporter["name"],
            # additional useful metadata (doesn't break anything if extra)
            "area": hotspot.get("area"),
            "ward": hotspot.get("ward"),
            "locality": hotspot.get("locality"),
            "city": city,
        }

        if resolved_at:
            case_doc["resolvedAt"] = iso(resolved_at)

        cases_to_insert.append(case_doc)

        # ---------- 3) Submissions timeline ----------
        # We create: REPORT + some FOLLOWUP + maybe AUTH_RESOLUTION near end
        # Spread timestamps between created_at and updated_at
        for sidx in range(submissions_count):
            if sidx == 0:
                sub_type = "REPORT"
            else:
                sub_type = "FOLLOWUP"

            # Add AUTH_RESOLUTION for resolved states
            if status in ["resolved_pending", "verified_resolved", "disputed"] and sidx == submissions_count - 2:
                sub_type = "AUTH_RESOLUTION"

            # time for this submission
            # older submissions earlier, last ones later
            frac = sidx / max(submissions_count - 1, 1)
            sub_time = created_at + (updated_at - created_at) * frac
            sub_time = sub_time + timedelta(hours=random.randint(0, 8), minutes=random.randint(0, 59))

            if sub_type == "AUTH_RESOLUTION":
                user_id = "user-authority-1"
                user_name = "Rahul Kumar"
                user_role = "authority"
                note = "Authority update: Resolution has been applied on-site. Please verify."
            else:
                cu = random.choice(citizen_pool)
                user_id = cu["id"]
                user_name = cu["name"]
                user_role = "citizen"
                note = "Follow-up evidence: Issue persists / requesting action." if sidx > 0 else "Initial report: Issue observed and reported."

            submission_doc = {
                "id": f"sub-{case_id}-{sidx+1}",
                "caseId": case_id,
                "userId": user_id,
                "userName": user_name,
                "userRole": user_role,
                "type": sub_type,
                "photoUrl": placeholder_images[sidx % len(placeholder_images)],
                "note": note,
                "lat": case_doc["lat"] + random.uniform(-0.0009, 0.0009),
                "lng": case_doc["lng"] + random.uniform(-0.0009, 0.0009),
                "createdAt": iso(sub_time),
            }
            submissions_to_insert.append(submission_doc)

        # ---------- 4) Supports ----------
        support_n = min(supporters_count, 120)
        # spread supports across time window
        for j in range(support_n):
            support_time = created_at + timedelta(days=random.randint(0, max(1, days_ignored)), hours=random.randint(0, 23))
            supports_to_insert.append({
                "id": f"support-{case_id}-{j+1}",
                "caseId": case_id,
                "userId": f"supporter-{idx}-{j+1}",
                "createdAt": iso(support_time),
            })

        # ---------- 5) Verifications ----------
        # only for resolved states
        if status in ["resolved_pending", "verified_resolved", "disputed"]:
            # Create realistic votes
            if status == "verified_resolved":
                votes = ["FIXED", "FIXED", "FIXED", "FIXED"]
            elif status == "disputed":
                votes = ["NOT_FIXED", "NOT_FIXED", "TEMPORARY", "NOT_FIXED"]
            else:
                # resolved_pending -> mixed + fewer votes
                votes = ["FIXED", "NOT_FIXED"]

            for k, vote in enumerate(votes):
                vt = updated_at - timedelta(hours=(k + 1) * 2)
                verifications_to_insert.append({
                    "id": f"verify-{case_id}-{k+1}",
                    "caseId": case_id,
                    "userId": f"verifier-{idx}-{k+1}",
                    "userName": f"Verifier {k+1}",
                    "userRole": "citizen",
                    "vote": vote,
                    "createdAt": iso(vt),
                })

    # ---------- Insert all ----------
    if cases_to_insert:
        await db.cases.insert_many(cases_to_insert)
    if submissions_to_insert:
        await db.submissions.insert_many(submissions_to_insert)
    if supports_to_insert:
        await db.supports.insert_many(supports_to_insert)
    if verifications_to_insert:
        await db.verifications.insert_many(verifications_to_insert)

    return {
        "message": "Multi-city seed data seeded successfully",
        "users": ["citizen@demo.com", "authority@demo.com", "moderator@demo.com"],
        "password": "demo123",
        "cities": ["Delhi", "Hyderabad", "Mumbai", "Bangalore", "Kolkata"],
        "cases": len(cases_to_insert),
        "submissions": len(submissions_to_insert),
        "supports": len(supports_to_insert),
        "verifications": len(verifications_to_insert),
    }


@api_router.post("/seed/reset")
async def reset_and_seed(user: dict = Depends(require_role("moderator"))):
    """Reset all data and reseed (moderator only)"""
    # Clear all collections
    await db.cases.delete_many({})
    await db.submissions.delete_many({})
    await db.supports.delete_many({})
    await db.verifications.delete_many({})
    await db.merge_history.delete_many({})
    
    # Re-seed
    return await seed_data()

from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException

# --------- Helpers (NOT a route!) ---------
def _safe_date_field(field_name: str):
    """
    Mongo expression:
    - if field is Date -> use it
    - if field is ISO string -> parse with $dateFromString
    - if empty/missing -> null
    """
    return {
        "$let": {
            "vars": {"v": f"${field_name}"},
            "in": {
                "$switch": {
                    "branches": [
                        # already a Date
                        {"case": {"$eq": [{"$type": "$$v"}, "date"]}, "then": "$$v"},
                        # ISO string
                        {
                            "case": {
                                "$and": [
                                    {"$eq": [{"$type": "$$v"}, "string"]},
                                    {"$ne": ["$$v", ""]},
                                ]
                            },
                            "then": {"$dateFromString": {"dateString": "$$v"}},
                        },
                    ],
                    "default": None,
                }
            },
        }
    }


@api_router.get("/analytics/overview")
async def analytics_overview(current_user: dict = Depends(get_current_user)):
    # Restrict to authority/moderator
    if current_user.get("role") not in ["authority", "moderator"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    now = datetime.utcnow()
    since = now - timedelta(days=30)

    # ------------- 1) Fetch last 200 cases (frontend-friendly list + quick aggregates) -------------
    case_projection = {
        "_id": 1,
        "title": 1,
        "status": 1,
        "category": 1,
        "daysIgnored": 1,
        "neglectScore": 1,
        "createdAt": 1,
        "area": 1,
        "ward": 1,
        "locality": 1,
    }

    cases_raw = await (
        db.cases.find({}, case_projection)
        .sort("createdAt", -1)
        .limit(200)
        .to_list(length=200)
    )

    cases_list = []
    by_status = defaultdict(int)
    by_category = defaultdict(int)
    neglect_scores = []
    days_ignored = []
    top_neglect = []

    for c in cases_raw:
        created = c.get("createdAt")
        created_iso = created.isoformat() if hasattr(created, "isoformat") else (created if isinstance(created, str) else None)

        status = c.get("status", "unknown")
        category = c.get("category", "unknown")
        di = int(c.get("daysIgnored", 0) or 0)
        ns = float(c.get("neglectScore", 0) or 0)

        cases_list.append(
            {
                "id": str(c["_id"]),
                "title": c.get("title"),
                "status": status,
                "category": category,
                "daysIgnored": di,
                "neglectScore": ns,
                "createdAt": created_iso,
                "area": c.get("area"),
                "ward": c.get("ward"),
                "locality": c.get("locality"),
            }
        )

        by_status[status] += 1
        by_category[category] += 1
        neglect_scores.append(ns)
        days_ignored.append(di)

        top_neglect.append(
            {
                "caseId": str(c["_id"]),
                "title": c.get("title"),
                "status": status,
                "category": category,
                "neglectScore": ns,
                "daysIgnored": di,
            }
        )

    avg_neglect_score = (sum(neglect_scores) / len(neglect_scores)) if neglect_scores else 0
    avg_days_ignored = (sum(days_ignored) / len(days_ignored)) if days_ignored else 0
    top_neglect_sorted = sorted(top_neglect, key=lambda x: (x["neglectScore"], x["daysIgnored"]), reverse=True)[:5]

    # ------------- 2) Option A: Avg Neglect Trend (daily, last 30 days) -------------
    pipeline_avg_neglect = [
        {"$addFields": {"createdAtDate": _safe_date_field("createdAt")}},
        {"$match": {"createdAtDate": {"$gte": since}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAtDate"}},
                "avgNeglect": {"$avg": {"$ifNull": ["$neglectScore", 0]}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    avg_neglect_raw = await db.cases.aggregate(pipeline_avg_neglect).to_list(length=None)
    avgNeglectTrendDaily = [
        {
            "date": x["_id"],
            "avgNeglect": round(float(x.get("avgNeglect", 0) or 0), 2),
            "count": int(x.get("count", 0) or 0),
        }
        for x in avg_neglect_raw
    ]

    # ------------- 3) Option C: Submissions Trend (daily, last 30 days) -------------
    pipeline_submissions_daily = [
        {"$addFields": {"createdAtDate": _safe_date_field("createdAt")}},
        {"$match": {"createdAtDate": {"$gte": since}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAtDate"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    submissions_raw = await db.submissions.aggregate(pipeline_submissions_daily).to_list(length=None)
    submissionsDaily = [{"date": x["_id"], "count": int(x["count"])} for x in submissions_raw]

    # ------------- 4) Totals + verification stats -------------
    total_cases = await db.cases.count_documents({})
    total_votes = await db.verifications.count_documents({})
    total_supports = await db.supports.count_documents({})
    total_submissions = await db.submissions.count_documents({})

    verified_resolved = by_status.get("verified_resolved", 0)
    disputed = by_status.get("disputed", 0)
    closed_total = verified_resolved + disputed + by_status.get("resolved_pending", 0)
    dispute_rate = (disputed / closed_total) if closed_total else 0

    return {
        "totals": {
            "cases": total_cases,
            "supports": total_supports,
            "submissions": total_submissions,
            "votes": total_votes,
        },
        "byStatus": dict(by_status),
        "byCategory": dict(by_category),
        "neglect": {
            "avgNeglectScore": round(avg_neglect_score, 1),
            "avgDaysIgnored": int(round(avg_days_ignored, 2)),
            "topNeglect": top_neglect_sorted,
        },
        "timeseries": {
            "avgNeglectTrendDaily": avgNeglectTrendDaily,
            "submissionsDaily": submissionsDaily,
        },
        "verification": {
            "verifiedResolved": verified_resolved,
            "disputed": disputed,
            "closedTotal": closed_total,
            "disputeRate": round(dispute_rate, 4),
        },
        "cases": cases_list,
    }


# ==================== AUTO-SEED ON STARTUP ====================

@app.on_event("startup")
async def startup_event():
    """Auto-seed demo data if database is empty"""
    user_count = await db.users.count_documents({})
    case_count = await db.cases.count_documents({})
    
    if user_count == 0 or case_count == 0:
        logger.info("Database empty, seeding demo data...")
        # Create seed data
        await seed_data()
        logger.info("Demo data seeded successfully")

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "CivicFix API", "version": "1.0.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

