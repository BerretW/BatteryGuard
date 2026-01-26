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
import zipfile
import io
import json
from bson import ObjectId
from fastapi.responses import StreamingResponse

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@appartus.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost") 
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
# --- JSON HELPER ---
class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime):
            return o.isoformat()
        return json.JSONEncoder.default(self, o)
    
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
@app.patch("/objects/{obj_id}/technologies/{tech_id}")
async def update_technology(obj_id: str, tech_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    # Sestavení dat pro update pomocí pozičního operátoru
    # Klíče musí být ve formátu "technologies.$[elem].field"
    set_data = {f"technologies.$[elem].{k}": v for k, v in updates.items()}
    
    result = await db.objects.update_one(
        {"id": obj_id},
        {"$set": set_data},
        array_filters=[{"elem.id": tech_id}]
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Object or technology not found")
        
    return {"status": "updated"}
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
# --- BACKUP & RESTORE ---

@app.get("/backup/export")
async def export_backup(user: dict = Depends(get_current_admin)):
    # 1. Stažení dat z DB
    data = {
        "objects": [fix_mongo_id(d) async for d in db.objects.find({})],
        "groups": [fix_mongo_id(d) async for d in db.groups.find({})],
        "templates": [fix_mongo_id(d) async for d in db.templates.find({})],
        "users": [fix_mongo_id(d) async for d in db.users.find({})],
    }

    # 2. Vytvoření ZIPu v paměti
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # A) Uložení JSON dat
        zip_file.writestr("data.json", json.dumps(data, cls=JSONEncoder, indent=2))
        
        # B) Uložení nahraných souborů (uploads složka)
        if os.path.exists(UPLOAD_DIR):
            for root, dirs, files in os.walk(UPLOAD_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Uložíme do zipu pod cestou uploads/nazev_souboru
                    zip_file.write(file_path, os.path.join("uploads", file))

    zip_buffer.seek(0)
    
    # 3. Odeslání souboru
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=batteryguard_backup_{timestamp}.zip"}
    )

@app.post("/backup/import")
async def import_backup(file: UploadFile = File(...), user: dict = Depends(get_current_admin)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(400, "File must be a ZIP archive")

    try:
        content = await file.read()
        zip_buffer = io.BytesIO(content)
        
        with zipfile.ZipFile(zip_buffer, "r") as zip_file:
            # 1. Kontrola integrity
            if "data.json" not in zip_file.namelist():
                raise HTTPException(400, "Invalid backup: missing data.json")

            # 2. Načtení JSON dat
            json_data = json.loads(zip_file.read("data.json").decode("utf-8"))
            
            # --- MIGRAČNÍ LOGIKA (Zde řešíme změnu struktury) ---
            # Pokud v záloze chybí nová pole, doplníme je defaulty
            
            # A) Objekty
            objects_to_import = []
            for obj in json_data.get("objects", []):
                # Fix: Doplnění technologies.deviceType
                for tech in obj.get("technologies", []):
                    if "deviceType" not in tech:
                        tech["deviceType"] = "Jiné zařízení" # Default pro staré zálohy
                
                # Fix: Doplnění tasks
                if "tasks" not in obj: obj["tasks"] = []
                
                # Fix: Doplnění files category
                for f in obj.get("files", []):
                    if "category" not in f: f["category"] = "OTHER"

                objects_to_import.append(obj)

            # B) Skupiny (Doplnění nových polí)
            groups_to_import = []
            for grp in json_data.get("groups", []):
                if "defaultBatteryLifeMonths" not in grp: grp["defaultBatteryLifeMonths"] = 24
                if "notificationLeadTimeWeeks" not in grp: grp["notificationLeadTimeWeeks"] = 4
                groups_to_import.append(grp)

            # 3. Vymazání současných dat (Full Restore)
            # Pokud chcete jen merge, tyto řádky smažte, ale restore obvykle znamená "vrátit stav"
            await db.objects.delete_many({})
            await db.groups.delete_many({})
            await db.templates.delete_many({})
            # Users mažeme opatrně - raději nechat admina, nebo přepsat vše kromě aktuálního?
            # Zde přepíšeme vše, protože restore dělá admin
            await db.users.delete_many({})

            # 4. Vložení dat
            if objects_to_import: await db.objects.insert_many(objects_to_import)
            if groups_to_import: await db.groups.insert_many(groups_to_import)
            if json_data.get("templates"): await db.templates.insert_many(json_data["templates"])
            if json_data.get("users"): await db.users.insert_many(json_data["users"])

            # 5. Obnovení souborů
            # Smažeme staré uploady
            if os.path.exists(UPLOAD_DIR):
                for filename in os.listdir(UPLOAD_DIR):
                    file_path = os.path.join(UPLOAD_DIR, filename)
                    try:
                        if os.path.isfile(file_path) or os.path.islink(file_path):
                            os.unlink(file_path)
                        elif os.path.isdir(file_path):
                            shutil.rmtree(file_path)
                    except Exception as e:
                        print(f"Failed to delete {file_path}. Reason: {e}")
            else:
                os.makedirs(UPLOAD_DIR, exist_ok=True)

            # Extrahujeme nové
            for member in zip_file.namelist():
                if member.startswith("uploads/") and not member.endswith("/"):
                    # member je např "uploads/soubor.jpg", my chceme jen "soubor.jpg" do složky UPLOAD_DIR
                    filename = os.path.basename(member)
                    if filename:
                        target_path = os.path.join(UPLOAD_DIR, filename)
                        with open(target_path, "wb") as f:
                            f.write(zip_file.read(member))

        return {"status": "success", "message": "System restored successfully"}

    except Exception as e:
        print(f"Restore error: {e}")
        raise HTTPException(500, f"Restore failed: {str(e)}")
# ==========================================
# --- QR KÓDY ENDPOINT ---
# ==========================================
@app.get("/qr/object/{obj_id}")
# Endpoint je veřejný (nevyžaduje přihlášení), aby šel načíst do <img> tagu
async def get_object_qr(obj_id: str): 
    # 1. Ověření, že objekt existuje
    doc = await db.objects.find_one({"id": obj_id})
    if not doc: raise HTTPException(404, "Object not found")

    # 2. Sestavení cílové URL na frontend
    # Frontend používá HashRouter, takže URL vypadá např.: http://localhost/#/object/123
    target_url = f"{PUBLIC_URL}/#/object/{obj_id}"

    # 3. Generování QR kódu
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H, # Vysoká korekce chyb
        box_size=10,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    # Vytvoření obrázku (použijeme stylovaný pro hezčí vzhled)
    # --- OPRAVA: TENTO ŘÁDEK ZDE CHYBĚL ---
    img = qr.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer())
    # --------------------------------------

    # 4. Uložení do paměti (BytesIO) místo na disk
    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)

    # 5. Odeslání jako streamovaný obrázek se správným kódováním názvu (RFC 5987)
    from urllib.parse import quote
    base_name = doc.get('name', 'object').replace(' ', '_')
    # Odstranění potenciálně problematických znaků pro název souboru
    safe_name = "".join([c for c in base_name if c.isalnum() or c in ('_', '-')])
    filename = f"qr_{safe_name}.png"
    encoded_filename = quote(filename)

    return StreamingResponse(
        img_buffer, 
        media_type="image/png",
        # Použijeme filename* pro UTF-8 podporu
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}"
        }
    )
# --- BATTERY TYPES (Katalog baterií) ---
@app.get("/battery-types")
async def get_battery_types(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.battery_types.find({})]

@app.post("/battery-types")
async def create_battery_type(bt: dict = Body(...), user: dict = Depends(get_current_admin)):
    if "id" not in bt: bt["id"] = uuid.uuid4().hex
    await db.battery_types.insert_one(bt)
    return fix_mongo_id(bt)

@app.delete("/battery-types/{bt_id}")
async def delete_battery_type(bt_id: str, user: dict = Depends(get_current_admin)):
    await db.battery_types.delete_one({"id": bt_id})
    return {"status": "deleted"}


# ==========================================
# --- USER MANAGEMENT (ADMIN ONLY) ---
# ==========================================

# 1. Získání všech uživatelů
@app.get("/users")
async def get_all_users(user: dict = Depends(get_current_admin)):
    users = []
    async for doc in db.users.find({}):
        # Odstraníme hash hesla z výstupu pro bezpečnost
        doc.pop("hashed_password", None)
        users.append(fix_mongo_id(doc))
    return users

# 2. Vytvoření uživatele (Adminem)
@app.post("/users")
async def create_user_admin(req: dict = Body(...), user: dict = Depends(get_current_admin)):
    # Validace emailu
    if await db.users.find_one({"email": req.get("email")}):
        raise HTTPException(400, "User with this email already exists")

    # Heslo - pokud není zadáno, vygenerujeme náhodné (nebo defaultní)
    raw_password = req.get("password") or "batteryguard123"
    
    new_user = {
        "id": uuid.uuid4().hex,
        "name": req.get("name", "Neznámý"),
        "email": req.get("email"),
        "role": req.get("role", "TECHNICIAN"), # 'ADMIN' nebo 'TECHNICIAN'
        "isAuthorized": True, # Adminem vytvořený uživatel je rovnou autorizovaný
        "hashed_password": get_password_hash(raw_password),
        "createdAt": datetime.utcnow().isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    # Vrátíme vytvořeného uživatele bez hesla
    new_user.pop("hashed_password", None)
    return fix_mongo_id(new_user)

# 3. Změna hesla jiného uživatele (Adminem)
@app.patch("/users/{user_id}/password")
async def admin_change_user_password(user_id: str, body: dict = Body(...), user: dict = Depends(get_current_admin)):
    new_password = body.get("newPassword")
    if not new_password:
        raise HTTPException(400, "New password is required")

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"hashed_password": get_password_hash(new_password)}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "User not found")
        
    return {"status": "password_updated"}

# ==========================================
# --- USER PROFILE (SELF) ---
# ==========================================

# 4. Změna vlastního hesla
@app.patch("/auth/password")
async def change_self_password(body: dict = Body(...), user: dict = Depends(get_current_user)):
    current_password = body.get("currentPassword")
    new_password = body.get("newPassword")
    
    if not current_password or not new_password:
        raise HTTPException(400, "Current and new passwords are required")

    # 1. Ověření starého hesla
    # Poznámka: 'user' z dependency neobsahuje hash (pokud ho get_current_user filtruje), 
    # nebo ho obsahuje. V původním kódu get_current_user vrací user objekt z DB.
    # Musíme si vytáhnout aktuální hash z DB pro jistotu, nebo z objektu user.
    
    # Pro jistotu načteme full user objekt i s heslem
    full_user = await db.users.find_one({"email": user["email"]})
    if not verify_password(current_password, full_user["hashed_password"]):
        raise HTTPException(400, "Invalid current password")

    # 2. Uložení nového hesla
    await db.users.update_one(
        {"email": user["email"]},
        {"$set": {"hashed_password": get_password_hash(new_password)}}
    )
    
    return {"status": "password_changed"}


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