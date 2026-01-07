import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
import requests
# Import modelů
from models import BuildingObject, ObjectGroup, UserAuth
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")


# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
# Načtení údajů z Docker Compose
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@local.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 

app = FastAPI(title="BatteryGuard API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, # Použijeme nastavení z docker-compose
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Klient
client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard

# Auth Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- POMOCNÉ FUNKCE ---

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

# --- STARTUP EVENT (Vytvoření admina) ---
@app.on_event("startup")
async def startup_db_client():
    # Zkontrolujeme, zda existuje alespoň jeden uživatel
    existing_user = await db.users.find_one({})
    
    if not existing_user:
        print(f"⚠️ Žádní uživatelé nenalezeni. Vytvářím výchozího admina: {ADMIN_EMAIL}")
        admin_user = {
            "id": "admin-001", 
            "name": "Hlavní Administrátor",
            "email": ADMIN_EMAIL, 
            "role": "ADMIN",
            "isAuthorized": True, 
            "hashed_password": get_password_hash(ADMIN_PASSWORD),
            "createdAt": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(admin_user)
        print("✅ Výchozí admin vytvořen.")
    else:
        print("ℹ️ Uživatelé v databázi existují, přeskakuji vytváření admina.")

# --- DEPENDENCIES ---

async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authentication header")
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
            
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
        
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
        
    user["id"] = str(user.get("id", ""))
    if "_id" in user: del user["_id"]
    return user

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return user

# --- ENDPOINTY ---

@app.get("/")
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

# --- AUTH ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = "pass"

@app.post("/auth/login")
async def login(creds: LoginRequest):
    # Standardní hledání v DB (už žádný hardcoded fallback)
    user = await db.users.find_one({"email": creds.email})
    
    if not user:
        raise HTTPException(status_code=400, detail="Nesprávný email nebo heslo")
    
    if not verify_password(creds.password, user["hashed_password"]):
         raise HTTPException(status_code=400, detail="Nesprávný email nebo heslo")

    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Účet čeká na schválení administrátorem")

    token = create_access_token(data={"sub": user["email"]})
    
    # Return user data mapped for frontend
    return {
        "token": token,
        "user": {
            "id": str(user.get("id", "")), # Bezpečnější get
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "isAuthorized": user["isAuthorized"],
            "createdAt": user["createdAt"]
        }
    }

@app.post("/auth/register")
async def register(req: RegisterRequest):
    existing = await db.users.find_one({"email": req.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email již existuje")
    
    new_user = {
        "id": str(datetime.utcnow().timestamp()).replace('.', ''),
        "name": req.name,
        "email": req.email,
        "role": "TECHNICIAN",
        "isAuthorized": False, 
        "hashed_password": get_password_hash(req.password),
        "createdAt": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(new_user)
    return {"status": "success", "message": "Registrace úspěšná, vyčkejte na schválení."}

class GoogleLoginRequest(BaseModel):
    token: str

@app.post("/auth/google")
async def google_login(req: GoogleLoginRequest):
    # 1. Ověření tokenu u Google UserInfo API
    try:
        response = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.token}"}
        )
        user_info = response.json()
        
        if "error" in user_info:
            raise HTTPException(status_code=400, detail="Invalid Google Token")
            
        email = user_info["email"]
        name = user_info["name"]
        
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to verify Google Token")

    # 2. Najít nebo vytvořit uživatele v DB
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Pokud neexistuje, vytvoříme ho (automaticky jako TECHNICIAN a neschválený?)
        # Nebo pokud má doménu vaší firmy, rovnou schválíme.
        new_user = {
            "id": str(datetime.utcnow().timestamp()).replace('.', ''),
            "name": name,
            "email": email,
            "role": "TECHNICIAN",
            "isAuthorized": False, # Čeká na schválení adminem
            "auth_provider": "google", # Značka, že je přes Google
            "hashed_password": "", # Nemá heslo
            "createdAt": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(new_user)
        user = new_user
    
    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Účet čeká na schválení administrátorem")

    # 3. Vygenerovat náš JWT token
    access_token = create_access_token(data={"sub": user["email"]})
    
    return {
        "token": access_token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "isAuthorized": user["isAuthorized"]
        }
    }
# --- DATA ENDPOINTS (Protected) ---

@app.get("/objects", response_model=List[BuildingObject])
async def get_objects(user: dict = Depends(get_current_user)):
    cursor = db.objects.find({})
    objects = []
    async for doc in cursor:
        if "_id" in doc: del doc["_id"]
        objects.append(doc)
    return objects

@app.post("/objects")
async def save_objects(objects: List[BuildingObject], user: dict = Depends(get_current_user)):
    # Sync strategie: Nahradit vše. 
    # V produkci pro velké objemy dat nevhodné, ale pro tuto architekturu App.tsx nutné.
    await db.objects.delete_many({})
    
    if objects:
        objects_data = [obj.dict() for obj in objects]
        await db.objects.insert_many(objects_data)
    
    return {"status": "saved", "count": len(objects)}

@app.get("/groups", response_model=List[ObjectGroup])
async def get_groups(user: dict = Depends(get_current_user)):
    cursor = db.groups.find({})
    groups = []
    async for doc in cursor:
        if "_id" in doc: del doc["_id"]
        groups.append(doc)
    return groups

@app.post("/groups")
async def save_groups(groups: List[ObjectGroup], user: dict = Depends(get_current_user)):
    await db.groups.delete_many({})
    if groups:
        groups_data = [g.dict() for g in groups]
        await db.groups.insert_many(groups_data)
    return {"status": "saved"}

# --- USER MANAGEMENT (Admin only) ---

@app.get("/users")
async def get_all_users(admin: dict = Depends(get_current_admin)):
    cursor = db.users.find({})
    users = []
    async for u in cursor:
        users.append({
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role"),
            "isAuthorized": u.get("isAuthorized"),
            "createdAt": u.get("createdAt")
        })
    return users

class UserUpdate(BaseModel):
    role: str
    isAuthorized: bool

@app.put("/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate, admin: dict = Depends(get_current_admin)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": update.role, "isAuthorized": update.isAuthorized}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "updated"}