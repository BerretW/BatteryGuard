import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr

# Import modelů (předpokládám, že models.py z minula máte, 
# pokud ne, použijte definice z předchozí odpovědi)
from models import BuildingObject, ObjectGroup, UserAuth

# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 dní platnost

app = FastAPI(title="BatteryGuard API")

# CORS (Povolíme vše, protože Nginx řeší same-origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Klient
client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard

# Auth Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = lambda: "Bearer <token>" # Placeholder

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
        
    # Převedeme na dict bez _id pro snadnou manipulaci
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
    password: str = "pass" # Default heslo

@app.post("/auth/login")
async def login(creds: LoginRequest):
    user = await db.users.find_one({"email": creds.email})
    
    if not user:
        # Fallback pro výchozího admina, pokud DB je prázdná
        if creds.email == "admin@local.cz" and creds.password == "admin123":
            # Vytvoříme ho on-the-fly, pokud neexistuje
            admin_user = {
                "id": "admin-001", "name": "Hlavní Administrátor",
                "email": "admin@local.cz", "role": "ADMIN",
                "isAuthorized": True, "hashed_password": get_password_hash("admin123"),
                "createdAt": datetime.utcnow().isoformat()
            }
            await db.users.insert_one(admin_user)
            user = admin_user
        else:
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
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "isAuthorized": user["isAuthorized"],
            "createdAt": user["createdAt"]
            # Ujistěte se, že zde NENÍ "hashed_password"
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
        "isAuthorized": False, # Defaultně neschválen
        "hashed_password": get_password_hash(req.password),
        "createdAt": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(new_user)
    return {"status": "success", "message": "Registrace úspěšná, vyčkejte na schválení."}

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