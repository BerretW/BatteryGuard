import os
import shutil
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status, Header, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
import requests

# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@appartus.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 

app = FastAPI(title="BatteryGuard API")

# --- STATIC FILES ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB & AUTH INIT ---
client = AsyncIOMotorClient(MONGO_URL)
db = client.batteryguard
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- MODELS ---
# (Zjednodušené modely pro validaci, v praxi lze použít ty z models.py)
class ObjectGroupModel(BaseModel):
    id: str
    name: str
    color: Optional[str] = None
    defaultBatteryLifeMonths: Optional[int] = 24  # Výchozí životnost: 2 roky
    notificationLeadTimeWeeks: Optional[int] = 4  # Výchozí upozornění: 4 týdny předem

class FormTemplateModel(BaseModel):
    id: str
    name: str
    icon: str
    fields: List[Dict[str, Any]]

# --- HELPERS ---
def fix_mongo_id(document: dict):
    if not document: return None
    if "_id" in document:
        if "id" not in document:
            document["id"] = str(document["_id"])
        del document["_id"]
    return document

def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)
def get_password_hash(pwd): return pwd_context.hash(pwd)
def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- AUTH DEPENDENCIES ---
async def get_current_user(authorization: str = Header(None)):
    if not authorization: raise HTTPException(401, "Missing auth")
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer': raise HTTPException(401, "Invalid scheme")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email: raise HTTPException(401, "Invalid payload")
    except Exception: raise HTTPException(401, "Invalid token")
    
    user = await db.users.find_one({"email": email})
    if not user: raise HTTPException(401, "User not found")
    return fix_mongo_id(user)

async def get_current_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN": raise HTTPException(403, "Not admin")
    return user

# --- AUTH ENDPOINTS (Login/Register/Google) ---
# ... (Zůstávají stejné jako v původním scriptu, zkráceno pro přehlednost) ...
@app.post("/auth/login")
async def login(creds: dict = Body(...)):
    user = await db.users.find_one({"email": creds.get("email")})
    if not user or not verify_password(creds.get("password"), user["hashed_password"]):
        raise HTTPException(400, "Bad credentials")
    if not user.get("isAuthorized"): raise HTTPException(403, "Not authorized")
    return {"token": create_access_token({"sub": user["email"]}), "user": fix_mongo_id(user)}

@app.post("/auth/register")
async def register(req: dict = Body(...)):
    if await db.users.find_one({"email": req["email"]}): raise HTTPException(400, "Exists")
    new_user = {
        "id": uuid.uuid4().hex, "name": req["name"], "email": req["email"], 
        "role": "TECHNICIAN", "isAuthorized": False, 
        "hashed_password": get_password_hash(req["password"]), "createdAt": datetime.utcnow().isoformat()
    }
    await db.users.insert_one(new_user)
    return {"status": "success"}

# --- DATA ENDPOINTS (SINGLE OBJECT CRUD) ---

# 1. Objekty - GET ALL
@app.get("/objects")
async def get_objects(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(doc) async for doc in db.objects.find({})]

# 2. Objekty - GET ONE
@app.get("/objects/{obj_id}")
async def get_object(obj_id: str, user: dict = Depends(get_current_user)):
    doc = await db.objects.find_one({"id": obj_id})
    if not doc: raise HTTPException(404, "Object not found")
    return fix_mongo_id(doc)

# 3. Objekty - CREATE (Single)
@app.post("/objects")
async def create_object(obj: dict = Body(...), user: dict = Depends(get_current_user)):
    # Pokud ID nepošle frontend, vygenerujeme
    if "id" not in obj: obj["id"] = uuid.uuid4().hex
    
    # Inicializace prázdných polí, pokud chybí
    for field in ["technologies", "logEntries", "scheduledEvents", "files", "tasks", "contacts", "pendingIssues"]:
        if field not in obj: obj[field] = []
        
    await db.objects.insert_one(obj)
    return fix_mongo_id(obj)

# 4. Objekty - UPDATE ROOT FIELDS (Single - PATCH)
# Upravuje pouze kořenové vlastnosti (název, adresa, poznámky, GPS...)
@app.patch("/objects/{obj_id}")
async def update_object_root(obj_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    # Zakážeme úpravu polí přes tento endpoint, aby se nepřeepsala
    protected_fields = ["technologies", "logEntries", "scheduledEvents", "files", "tasks", "contacts", "pendingIssues", "_id", "id"]
    safe_updates = {k: v for k, v in updates.items() if k not in protected_fields}
    
    if not safe_updates:
        return {"status": "no_changes"}

    result = await db.objects.update_one({"id": obj_id}, {"$set": safe_updates})
    if result.matched_count == 0: raise HTTPException(404, "Object not found")
    return {"status": "updated", "fields": list(safe_updates.keys())}

# 5. Objekty - DELETE
@app.delete("/objects/{obj_id}")
async def delete_object(obj_id: str, user: dict = Depends(get_current_user)):
    await db.objects.delete_one({"id": obj_id})
    return {"status": "deleted"}

# --- ATOMICKÉ OPERACE PRO POLE (NESTED ARRAYS) ---

# A) TECHNOLOGIE
@app.post("/objects/{obj_id}/technologies")
async def add_technology(obj_id: str, tech: dict = Body(...), user: dict = Depends(get_current_user)):
    # Atomický $push
    await db.objects.update_one({"id": obj_id}, {"$push": {"technologies": tech}})
    return {"status": "added"}

@app.delete("/objects/{obj_id}/technologies/{tech_id}")
async def remove_technology(obj_id: str, tech_id: str, user: dict = Depends(get_current_user)):
    # Atomický $pull
    await db.objects.update_one({"id": obj_id}, {"$pull": {"technologies": {"id": tech_id}}})
    return {"status": "removed"}

# B) BATERIE (Vnořené v technologiích)
@app.post("/objects/{obj_id}/technologies/{tech_id}/batteries")
async def add_battery(obj_id: str, tech_id: str, battery: dict = Body(...), user: dict = Depends(get_current_user)):
    # $push do vnořeného pole pomocí pozičního operátoru nebo arrayFilters.
    # Zde použijeme query na id objektu A id technologie
    await db.objects.update_one(
        {"id": obj_id, "technologies.id": tech_id},
        {"$push": {"technologies.$.batteries": battery}}
    )
    return {"status": "added"}

@app.patch("/objects/{obj_id}/technologies/{tech_id}/batteries/{bat_id}")
async def update_battery_status(obj_id: str, tech_id: str, bat_id: str, update: dict = Body(...), user: dict = Depends(get_current_user)):
    # Atomický update konkrétní baterie uvnitř pole baterií uvnitř pole technologií
    # Používáme arrayFilters pro přesné zacílení
    
    # Sestavení $set objektu (např. "technologies.$[t].batteries.$[b].status": "CRITICAL")
    set_data = {f"technologies.$[t].batteries.$[b].{k}": v for k, v in update.items()}
    
    await db.objects.update_one(
        {"id": obj_id},
        {"$set": set_data},
        array_filters=[{"t.id": tech_id}, {"b.id": bat_id}]
    )
    return {"status": "updated"}

@app.delete("/objects/{obj_id}/technologies/{tech_id}/batteries/{bat_id}")
async def remove_battery(obj_id: str, tech_id: str, bat_id: str, user: dict = Depends(get_current_user)):
    await db.objects.update_one(
        {"id": obj_id, "technologies.id": tech_id},
        {"$pull": {"technologies.$.batteries": {"id": bat_id}}}
    )
    return {"status": "removed"}

# C) LOGY (Deník)
@app.post("/objects/{obj_id}/logs")
async def add_log(obj_id: str, log: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$push": {"logEntries": {"$each": [log], "$position": 0}}}) # Nové logy nahoru
    return {"status": "added"}

# D) TASKS (Úkoly)
@app.post("/objects/{obj_id}/tasks")
async def add_task(obj_id: str, task: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$push": {"tasks": task}})
    return {"status": "added"}

@app.patch("/objects/{obj_id}/tasks/{task_id}")
async def update_task(obj_id: str, task_id: str, update: dict = Body(...), user: dict = Depends(get_current_user)):
    set_data = {f"tasks.$[elem].{k}": v for k, v in update.items()}
    await db.objects.update_one(
        {"id": obj_id},
        {"$set": set_data},
        array_filters=[{"elem.id": task_id}]
    )
    return {"status": "updated"}

@app.delete("/objects/{obj_id}/tasks/{task_id}")
async def remove_task(obj_id: str, task_id: str, user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$pull": {"tasks": {"id": task_id}}})
    return {"status": "removed"}

# E) FILES & PENDING ISSUES & EVENTS (Generic array handling)
# Pro zkrácení vytvoříme generickou funkci, ale v produkci je lepší mít explicitní
@app.post("/objects/{obj_id}/{collection_name}")
async def add_to_collection(obj_id: str, collection_name: str, item: dict = Body(...), user: dict = Depends(get_current_user)):
    if collection_name not in ["files", "scheduledEvents", "contacts", "pendingIssues"]:
        raise HTTPException(400, "Invalid collection")
    await db.objects.update_one({"id": obj_id}, {"$push": {collection_name: item}})
    return {"status": "added"}

@app.delete("/objects/{obj_id}/{collection_name}/{item_id}")
async def remove_from_collection(obj_id: str, collection_name: str, item_id: str, user: dict = Depends(get_current_user)):
    if collection_name not in ["files", "scheduledEvents", "contacts", "pendingIssues"]:
        raise HTTPException(400, "Invalid collection")
    await db.objects.update_one({"id": obj_id}, {"$pull": {collection_name: {"id": item_id}}})
    return {"status": "removed"}

@app.patch("/objects/{obj_id}/pendingIssues/{issue_id}")
async def update_issue_status(obj_id: str, issue_id: str, update: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one(
        {"id": obj_id, "pendingIssues.id": issue_id},
        {"$set": {"pendingIssues.$.status": update.get("status")}}
    )
    return {"status": "updated"}


# --- OSTATNÍ CRUD (Groups, Templates) ---
# Skupiny a šablony se mění zřídka, tam můžeme nechat standardní CRUD nebo i bulk save pokud je to nutné,
# ale pro konzistenci uděláme taky CRUD.

@app.get("/groups")
async def get_groups(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.groups.find({})]

@app.post("/groups") # Nyní přijímá jeden objekt, ne list (pokud chceme single create)
async def create_group_or_bulk(data: Any = Body(...), user: dict = Depends(get_current_user)):
    # Zpětná kompatibilita pro bulk save (pokud frontend posílá list)
    if isinstance(data, list):
        await db.groups.delete_many({})
        if data: await db.groups.insert_many(data)
        return {"status": "bulk_saved"}
    else:
        # Single create
        if "id" not in data: data["id"] = uuid.uuid4().hex
        await db.groups.insert_one(data)
        return {"status": "created"}

@app.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(get_current_user)):
    await db.groups.delete_one({"id": group_id})
    return {"status": "deleted"}

@app.get("/templates")
async def get_templates(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.templates.find({})]

@app.post("/templates")
async def save_templates(templates: List[dict] = Body(...), user: dict = Depends(get_current_user)):
    # Templates se editují jen v admin sekci, tam bulk save tolik nevadí, 
    # ale pro jistotu:
    await db.templates.delete_many({})
    if templates: await db.templates.insert_many(templates)
    return {"status": "saved"}

# --- UPLOAD ---
@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    try:
        ext = os.path.splitext(file.filename)[1]
        name = f"{uuid.uuid4()}{ext}"
        path = os.path.join(UPLOAD_DIR, name)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"url": f"/uploads/{name}", "filename": file.filename}
    except Exception as e:
        raise HTTPException(500, f"Upload error: {e}")

# --- STARTUP ---
@app.on_event("startup")
async def startup_db_client():
    if not await db.users.find_one({}):
        await db.users.insert_one({
            "id": "admin", "name": "Admin", "email": ADMIN_EMAIL, "role": "ADMIN", 
            "isAuthorized": True, "hashed_password": get_password_hash(ADMIN_PASSWORD)
        })
    # Seed templates if empty
    if not await db.templates.find_one({}):
        await db.templates.insert_many([
             {"id": "t-service", "name": "Servisní zásah", "icon": "Wrench", "fields": [{"id": "f1", "label": "Popis", "type": "textarea", "required": True}]},
             {"id": "t-revision", "name": "Revize", "icon": "ClipboardCheck", "fields": [{"id": "f7", "label": "Příští termín", "type": "date", "required": True}]}
        ])