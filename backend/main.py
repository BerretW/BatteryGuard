import os
import requests
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr

import shutil
import uuid
from fastapi.staticfiles import StaticFiles
from fastapi import UploadFile, File

# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@appartus.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# Pro budoucí použití (validace server-side)
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 týden

app = FastAPI(title="BatteryGuard API")
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- DATA MODELS (Pydantic) ---
# Definujeme modely, aby FastAPI vědělo, co má očekávat v Body

class FormFieldModel(BaseModel):
    id: str
    label: str
    type: str
    required: bool
    options: Optional[List[str]] = None

class FormTemplateModel(BaseModel):
    id: str
    name: str
    icon: str
    fields: List[FormFieldModel]

class ObjectGroupModel(BaseModel):
    id: str
    name: str
    color: Optional[str] = None

# Zbytek modelů importujeme nebo definujeme volněji (dict), 
# ale pro Templates a Groups je lepší mít validaci.

# --- POMOCNÉ FUNKCE ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def fix_mongo_id(document: dict):
    if not document: return None
    if "_id" in document:
        if "id" not in document:
            document["id"] = str(document["_id"])
        del document["_id"]
    return document

# --- STARTUP SEEDING (Inicializace dat) ---
@app.on_event("startup")
async def startup_db_client():
    # 1. Admin
    if not await db.users.find_one({}):
        print(f"⚠️ Creating default admin: {ADMIN_EMAIL}")
        admin_user = {
            "id": "admin-001", "name": "Hlavní Administrátor", "email": ADMIN_EMAIL, 
            "role": "ADMIN", "isAuthorized": True, 
            "hashed_password": get_password_hash(ADMIN_PASSWORD),
            "createdAt": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(admin_user)

    # 2. Groups
    if not await db.groups.find_one({}):
        print("ℹ️ Seeding default groups...")
        await db.groups.insert_many([
            {"id": "g1", "name": "ČSOB", "color": "#00539b"},
            {"id": "g2", "name": "Městský úřad", "color": "#ee1c25"},
            {"id": "g3", "name": "Sklady LogiTech", "color": "#22c55e"}
        ])

    # 3. Templates (DŮLEŽITÉ PRO SETTINGS)
    if not await db.templates.find_one({}):
        print("ℹ️ Seeding default templates...")
        await db.templates.insert_many([
            {
                "id": "t-service", "name": "Servisní zásah", "icon": "Wrench",
                "fields": [
                    {"id": "f1", "label": "Popis prací", "type": "textarea", "required": True},
                    {"id": "f2", "label": "Použitý materiál", "type": "text", "required": False},
                    {"id": "f3", "label": "Čas (hod)", "type": "number", "required": True}
                ]
            },
            {
                "id": "t-revision", "name": "Pravidelná revize", "icon": "ClipboardCheck",
                "fields": [
                    {"id": "f6", "label": "Výsledek", "type": "select", "required": True, "options": ["Vyhovuje", "Nevyhovuje"]},
                    {"id": "f7", "label": "Příští termín", "type": "date", "required": True}
                ]
            }
        ])

# --- AUTH DEPENDENCIES ---
async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authentication header")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer': raise HTTPException(status_code=401, detail="Invalid scheme")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401, detail="Invalid payload")
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    
    user = await db.users.find_one({"email": email})
    if not user: raise HTTPException(status_code=401, detail="User not found")
    return fix_mongo_id(user)

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN": raise HTTPException(status_code=403, detail="Not enough privileges")
    return user

# --- AUTH ENDPOINTS ---
@app.post("/auth/login")
async def login(creds: dict = Body(...)):
    user = await db.users.find_one({"email": creds.get("email")})
    if not user or (user.get("hashed_password") and not verify_password(creds.get("password"), user["hashed_password"])):
        raise HTTPException(status_code=400, detail="Bad credentials")
    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Not authorized")
    return {"token": create_access_token(data={"sub": user["email"]}), "user": fix_mongo_id(user)}

@app.post("/auth/register")
async def register(req: dict = Body(...)):
    if await db.users.find_one({"email": req["email"]}):
        raise HTTPException(status_code=400, detail="Email exists")
    new_user = {
        "id": str(datetime.utcnow().timestamp()).replace('.', ''),
        "name": req["name"], "email": req["email"], "role": "TECHNICIAN",
        "isAuthorized": False, "hashed_password": get_password_hash(req["password"]),
        "createdAt": datetime.utcnow().isoformat()
    }
    await db.users.insert_one(new_user)
    return {"status": "success"}

@app.post("/auth/google")
async def google_login(req: dict = Body(...)):
    token = req.get("token")
    try:
        resp = requests.get("https://www.googleapis.com/oauth2/v3/userinfo", headers={"Authorization": f"Bearer {token}"})
        info = resp.json()
        if "error" in info: raise ValueError("Invalid Token")
        email, name = info["email"], info["name"]
    except Exception:
        raise HTTPException(status_code=400, detail="Google auth failed")

    user = await db.users.find_one({"email": email})
    if not user:
        new_user = {
            "id": str(datetime.utcnow().timestamp()).replace('.', ''),
            "name": name, "email": email, "role": "TECHNICIAN", "isAuthorized": False,
            "auth_provider": "google", "createdAt": datetime.utcnow().isoformat()
        }
        await db.users.insert_one(new_user)
        user = new_user
    
    if not user.get("isAuthorized", False):
        raise HTTPException(status_code=403, detail="Not authorized")

    return {"token": create_access_token(data={"sub": user["email"]}), "user": fix_mongo_id(user)}

# --- DATA ENDPOINTS ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    try:
        # Vygenerujeme unikátní název souboru
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Uložíme soubor
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Vrátíme relativní URL (frontend si přidá /api)
        return {"url": f"/uploads/{unique_filename}", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
# 1. Objekty
@app.get("/objects")
async def get_objects(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(doc) async for doc in db.objects.find({})]

@app.post("/objects")
async def save_objects(objects: List[dict], user: dict = Depends(get_current_user)):
    await db.objects.delete_many({})
    if objects: await db.objects.insert_many(objects)
    return {"status": "saved"}

# 2. Skupiny
@app.get("/groups")
async def get_groups(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(doc) async for doc in db.groups.find({})]

@app.post("/groups")
async def save_groups(groups: List[ObjectGroupModel], user: dict = Depends(get_current_user)):
    await db.groups.delete_many({})
    if groups: await db.groups.insert_many([g.dict() for g in groups])
    return {"status": "saved"}

# 3. Šablony (Templates)
@app.get("/templates")
async def get_templates(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(doc) async for doc in db.templates.find({})]

@app.post("/templates")
async def save_templates(templates: List[FormTemplateModel], user: dict = Depends(get_current_user)):
    await db.templates.delete_many({})
    if templates: await db.templates.insert_many([t.dict() for t in templates])
    return {"status": "saved"}

# 4. Uživatelé (Admin)
@app.get("/users")
async def get_users(admin: dict = Depends(get_current_admin)):
    return [fix_mongo_id(doc) async for doc in db.users.find({})]

@app.put("/users/{user_id}")
async def update_user(user_id: str, update: dict = Body(...), admin: dict = Depends(get_current_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"role": update["role"], "isAuthorized": update["isAuthorized"]}})
    return {"status": "updated"}