import os
from typing import List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from models import BuildingObject, ObjectGroup, UserAuth, UserDB

# Konfigurace
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hodin

app = FastAPI(title="BatteryGuard API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # V produkci omezit na doménu frontendu
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Databáze
client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard

# Auth Utils
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency pro ověření tokenu
async def get_current_user(token: str = Depends(lambda x: x)):
    # Zjednodušené pro demo - v reálu extrahovat z hlavičky Authorization: Bearer
    # Frontend posílá prostý request, implementace v services/apiService.ts je jednoduchá.
    # Zde necháme otevřené nebo implementujeme základní check, pokud frontend posílá header.
    pass

# --- ENDPOINTS ---

@app.get("/")
async def root():
    return {"status": "running", "service": "BatteryGuard Pro API"}

# 1. Objekty
@app.get("/objects", response_model=List[BuildingObject])
async def get_objects():
    objects = await db.objects.find().to_list(1000)
    return objects

@app.post("/objects")
async def save_objects(objects: List[BuildingObject]):
    # Frontend posílá VŠECHNY objekty najednou (podle apiService.ts)
    # Pro robustnost smažeme staré a vložíme nové (nebo uděláme bulk upsert)
    # V reálu by bylo lepší posílat jen změněné, ale dodržíme logiku frontendu.
    if not objects:
        return {"message": "No objects to save"}
    
    # Smazat existující (pro tento demo účel) a nahradit novými
    # V produkci by se toto mělo dělat chytřeji (upsert podle ID)
    await db.objects.delete_many({})
    
    # Mongo vyžaduje dict, ne Pydantic model
    objects_dicts = [obj.model_dump() for obj in objects]
    if objects_dicts:
        await db.objects.insert_many(objects_dicts)
    
    return {"status": "success", "count": len(objects)}

# 2. Skupiny
@app.get("/groups", response_model=List[ObjectGroup])
async def get_groups():
    groups = await db.groups.find().to_list(1000)
    return groups

@app.post("/groups")
async def save_groups(groups: List[ObjectGroup]):
    await db.groups.delete_many({})
    groups_dicts = [g.model_dump() for g in groups]
    if groups_dicts:
        await db.groups.insert_many(groups_dicts)
    return {"status": "success"}

# 3. Auth (Zjednodušené pro kompatibilitu s frontendem)
@app.post("/auth/login")
async def login(auth_data: UserAuth):
    user = await db.users.find_one({"email": auth_data.email})
    if not user or not verify_password(auth_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user["email"]})
    
    # Frontend očekává { user: AppUser, token: string }
    user_resp = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "isAuthorized": user["isAuthorized"],
        "createdAt": user["createdAt"]
    }
    return {"user": user_resp, "token": access_token}

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = "pass" # Default heslo pro demo, frontend ho při registraci neposílá

@app.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = {
        "id": str(datetime.utcnow().timestamp()), # Simple ID generation
        "name": req.name,
        "email": req.email,
        "role": "TECHNICIAN",
        "isAuthorized": False,
        "hashed_password": get_password_hash(req.password),
        "createdAt": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(new_user)
    return {"status": "registered", "user": new_user}

# Inicializace testovacího admina při startu
@app.on_event("startup")
async def startup_db_client():
    admin = await db.users.find_one({"email": "admin@local.cz"})
    if not admin:
        await db.users.insert_one({
            "id": "admin-001",
            "name": "Hlavní Administrátor",
            "email": "admin@local.cz",
            "role": "ADMIN",
            "isAuthorized": True,
            "hashed_password": get_password_hash("admin123"),
            "createdAt": datetime.utcnow().isoformat()
        })