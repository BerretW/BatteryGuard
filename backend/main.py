import os
import requests
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

# Google Auth Libraries
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Import modelů (předpokládáme, že soubor models.py existuje ve stejné složce)
from models import BuildingObject, ObjectGroup, UserAuth

# --- KONFIGURACE Z PROSTŘEDÍ ---
# Načtení proměnných z Docker Compose / ENV
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@appartus.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

# Nastavení JWT
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 týden

app = FastAPI(title="BatteryGuard API")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABÁZE ---
client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard

# --- SECURITY ---
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

def fix_mongo_id(document: dict):
    """Pomocná funkce pro převod MongoDB _id na string id pro frontend"""
    if not document:
        return None
    if "_id" in document:
        if "id" not in document:
            document["id"] = str(document["_id"])
        del document["_id"]
    return document

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
        
    return fix_mongo_id(user)

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough privileges")
    return user

# --- ENDPOINTY ---

@app.get("/")
async def health_check():
    return {"status": "ok", "version": "1.0.0", "google_client_configured": bool(GOOGLE_CLIENT_ID)}

# --- AUTHENTICATION ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str = "pass"

class GoogleLoginRequest(BaseModel):
    token: str

@app.post("/auth/login")
async def login(creds: LoginRequest):
    user = await db.users.find_one({"email": creds.email})
    
    if not user:
        raise HTTPException(status_code=400, detail="Nesprávný email nebo heslo")
    
    # Pokud uživatel má heslo (není jen přes Google), ověříme ho
    if user.get("hashed_password") and not verify_password(creds.password, user["hashed_password"]):
         raise HTTPException(status_code=400, detail="Nesprávný email nebo heslo")

    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Účet čeká na schválení administrátorem")

    token = create_access_token(data={"sub": user["email"]})
    
    return {
        "token": token,
        "user": fix_mongo_id(user)
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

@app.post("/auth/google")
async def google_login(req: GoogleLoginRequest):
    email = ""
    name = ""
    
    # 1. Pokusíme se ověřit token jako ID Token (preferovaná metoda)
    try:
        # Pokud nemáme nastaveno Client ID, warning, ale zkusíme validovat bez audience checku (méně bezpečné)
        # nebo spadneme do except bloku.
        id_info = id_token.verify_oauth2_token(
            req.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        email = id_info['email']
        name = id_info.get('name', email.split('@')[0])
        
    except Exception as e1:
        # 2. Fallback: Pokud selže ID token verification, zkusíme to jako Access Token
        # (Toto používá useGoogleLogin hook ve frontendu)
        try:
            print(f"ID Token verification failed ({str(e1)}), trying Access Token via UserInfo endpoint...")
            response = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {req.token}"}
            )
            user_info = response.json()
            
            if "error" in user_info:
                print(f"UserInfo error: {user_info}")
                raise ValueError("Invalid Google Access Token")
                
            email = user_info["email"]
            name = user_info["name"]
            
        except Exception as e2:
            print(f"Google Auth Failed. ID Token Error: {e1}, Access Token Error: {e2}")
            raise HTTPException(status_code=400, detail="Failed to verify Google Token")

    # 3. Logika přihlášení / registrace v DB
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Registrace nového uživatele přes Google
        new_user = {
            "id": str(datetime.utcnow().timestamp()).replace('.', ''),
            "name": name,
            "email": email,
            "role": "TECHNICIAN",
            "isAuthorized": False, # Čeká na schválení adminem
            "auth_provider": "google",
            "hashed_password": "", # Nemá heslo
            "createdAt": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(new_user)
        user = new_user
    
    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Účet čeká na schválení administrátorem")

    # 4. Vygenerovat náš JWT token
    access_token = create_access_token(data={"sub": user["email"]})
    
    return {
        "token": access_token,
        "user": fix_mongo_id(user)
    }

# --- DATA ENDPOINTS (Protected) ---

@app.get("/objects", response_model=List[BuildingObject])
async def get_objects(user: dict = Depends(get_current_user)):
    cursor = db.objects.find({})
    objects = []
    async for doc in cursor:
        objects.append(fix_mongo_id(doc))
    return objects

@app.post("/objects")
async def save_objects(objects: List[BuildingObject], user: dict = Depends(get_current_user)):
    # Sync strategie: Nahradit vše (pro jednoduchost architektury)
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
        groups.append(fix_mongo_id(doc))
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
        u = fix_mongo_id(u)
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