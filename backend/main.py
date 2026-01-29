import os
import shutil
import uuid
import json
import io
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Depends, status, Header, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from bson import ObjectId

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

# --- IMPORT MODELŮ ---
# Předpokládáme, že soubor models.py je ve stejné složce jako main.py
from models import (
    BuildingObject, ObjectGroup, CompanySettings, ServiceReport, 
    ReportMeasurement, BillingInfo, Address, UserDB, Technology,
    Battery, BatteryTypeModel
)

# --- KONFIGURACE ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongo:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey_change_me_in_prod")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@appartus.cz")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://battery.appartus.cz") 
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

# ==========================================
# --- AUTH ENDPOINTS ---
# ==========================================
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

# ==========================================
# --- GLOBÁLNÍ NASTAVENÍ (MOJE FIRMA) ---
# ==========================================

@app.get("/settings/company")
async def get_company_settings(user: dict = Depends(get_current_user)):
    doc = await db.settings.find_one({"id": "global_settings"})
    if not doc:
        # Defaultní prázdná struktura
        return {
            "id": "global_settings",
            "name": "Moje Firma s.r.o.",
            "address": {"street": "", "city": "", "zipCode": ""},
            "ico": "", "dic": "", "phone": "", "email": ""
        }
    return fix_mongo_id(doc)

@app.post("/settings/company")
async def save_company_settings(settings: CompanySettings, user: dict = Depends(get_current_user)):
    if user.get("role") != "ADMIN": raise HTTPException(403, "Only admin")
    
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": settings.dict()},
        upsert=True
    )
    return {"status": "saved"}

# ==========================================
# --- DATA ENDPOINTS (OBJECTS) ---
# ==========================================

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

# 3. Objekty - CREATE
@app.post("/objects")
async def create_object(obj: dict = Body(...), user: dict = Depends(get_current_user)):
    if "id" not in obj: obj["id"] = uuid.uuid4().hex
    
    # Inicializace polí
    for field in ["technologies", "logEntries", "scheduledEvents", "files", "tasks", "contacts", "pendingIssues"]:
        if field not in obj: obj[field] = []
        
    await db.objects.insert_one(obj)
    return fix_mongo_id(obj)

# 4. Objekty - UPDATE ROOT
@app.patch("/objects/{obj_id}")
async def update_object_root(obj_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
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

# ==========================================
# --- ATOMICKÉ OPERACE (TECHNOLOGIES, ETC.) ---
# ==========================================

# A) TECHNOLOGIE
@app.post("/objects/{obj_id}/technologies")
async def add_technology(obj_id: str, tech: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$push": {"technologies": tech}})
    return {"status": "added"}

@app.patch("/objects/{obj_id}/technologies/{tech_id}")
async def update_technology(obj_id: str, tech_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    set_data = {f"technologies.$[elem].{k}": v for k, v in updates.items()}
    result = await db.objects.update_one(
        {"id": obj_id}, {"$set": set_data}, array_filters=[{"elem.id": tech_id}]
    )
    if result.matched_count == 0: raise HTTPException(404, "Object or technology not found")
    return {"status": "updated"}

@app.delete("/objects/{obj_id}/technologies/{tech_id}")
async def remove_technology(obj_id: str, tech_id: str, user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$pull": {"technologies": {"id": tech_id}}})
    return {"status": "removed"}

# B) BATERIE
@app.post("/objects/{obj_id}/technologies/{tech_id}/batteries")
async def add_battery(obj_id: str, tech_id: str, battery: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one(
        {"id": obj_id, "technologies.id": tech_id},
        {"$push": {"technologies.$.batteries": battery}}
    )
    return {"status": "added"}

@app.patch("/objects/{obj_id}/technologies/{tech_id}/batteries/{bat_id}")
async def update_battery_status(obj_id: str, tech_id: str, bat_id: str, update: dict = Body(...), user: dict = Depends(get_current_user)):
    set_data = {f"technologies.$[t].batteries.$[b].{k}": v for k, v in update.items()}
    await db.objects.update_one(
        {"id": obj_id}, {"$set": set_data}, array_filters=[{"t.id": tech_id}, {"b.id": bat_id}]
    )
    return {"status": "updated"}

@app.delete("/objects/{obj_id}/technologies/{tech_id}/batteries/{bat_id}")
async def remove_battery(obj_id: str, tech_id: str, bat_id: str, user: dict = Depends(get_current_user)):
    await db.objects.update_one(
        {"id": obj_id, "technologies.id": tech_id},
        {"$pull": {"technologies.$.batteries": {"id": bat_id}}}
    )
    return {"status": "removed"}

# C) LOGY
@app.post("/objects/{obj_id}/logs")
async def add_log(obj_id: str, log: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$push": {"logEntries": {"$each": [log], "$position": 0}}})
    return {"status": "added"}

# D) TASKS
@app.post("/objects/{obj_id}/tasks")
async def add_task(obj_id: str, task: dict = Body(...), user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$push": {"tasks": task}})
    return {"status": "added"}

@app.patch("/objects/{obj_id}/tasks/{task_id}")
async def update_task(obj_id: str, task_id: str, update: dict = Body(...), user: dict = Depends(get_current_user)):
    set_data = {f"tasks.$[elem].{k}": v for k, v in update.items()}
    await db.objects.update_one(
        {"id": obj_id}, {"$set": set_data}, array_filters=[{"elem.id": task_id}]
    )
    return {"status": "updated"}

@app.delete("/objects/{obj_id}/tasks/{task_id}")
async def remove_task(obj_id: str, task_id: str, user: dict = Depends(get_current_user)):
    await db.objects.update_one({"id": obj_id}, {"$pull": {"tasks": {"id": task_id}}})
    return {"status": "removed"}

# E) KOLEKCE (Files, Issues, Events, Contacts)
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

# ==========================================
# --- GENERÁTOR REVIZÍ / PROTOKOLŮ ---
# ==========================================

async def generate_report_number(year: int) -> str:
    """Vygeneruje číslo revize ve formátu PORADÍ/ROK (např. 52/2025)"""
    regex = f"/{year}$"
    last_report = await db.reports.find_one(
        {"reportNumber": {"$regex": regex}},
        sort=[("createdAt", -1)]
    )
    
    if last_report:
        try:
            last_seq = int(last_report["reportNumber"].split("/")[0])
            new_seq = last_seq + 1
        except:
            new_seq = 1
    else:
        new_seq = 1
        
    return f"{new_seq}/{year}"

@app.post("/reports/generate")
async def generate_report_draft(
    request: dict = Body(...), 
    user: dict = Depends(get_current_user)
):
    """
    Vygeneruje draft revize na základě dat objektu.
    Body: { "objectId": "...", "type": "REVIZE_EZS" }
    """
    obj_id = request.get("objectId")
    report_type = request.get("type", "REVIZE_EZS")
    
    # 1. Načtení dat (Snapshoty)
    obj_doc = await db.objects.find_one({"id": obj_id})
    if not obj_doc: raise HTTPException(404, "Object not found")
    
    group_doc = await db.groups.find_one({"id": obj_doc.get("groupId")}) if obj_doc.get("groupId") else None
    company_doc = await db.settings.find_one({"id": "global_settings"})
    
    # Validace nastavení firmy
    if not company_doc:
        raise HTTPException(400, "Nejdříve vyplňte údaje o Vaší firmě v nastavení.")
        
    supplier_info = CompanySettings(**company_doc)
    
    # Fakturační údaje (BillingInfo)
    customer_info = None
    if group_doc and "billingInfo" in group_doc:
        # Pokud skupina má billingInfo
        customer_info = BillingInfo(**group_doc["billingInfo"])
    else:
        # Fallback: Použijeme název skupiny nebo objektu a adresu objektu
        customer_info = BillingInfo(
            name=group_doc["name"] if group_doc else obj_doc["name"],
            ico="",
            address=Address(street=obj_doc["address"], city="", zipCode="")
        )

    # 2. Generování čísla
    now = datetime.now()
    report_number = await generate_report_number(now.year)
    
    # 3. Analýza technologií pro "Instalováno" a "Měření"
    device_list = []
    measurements = []
    
    technologies = obj_doc.get("technologies", [])
    
    # Logika pro EZS (PZTS)
    if report_type == "REVIZE_EZS":
        # Výpis hlavních komponent
        for tech in technologies:
            device_list.append(f"{tech.get('deviceType', 'Zařízení')}: {tech['name']} ({tech['location']})")
            
            # Pokud má baterie, připravíme řádek pro měření
            for bat in tech.get("batteries", []):
                measurements.append(ReportMeasurement(
                    id=str(uuid.uuid4()),
                    label=f"Napětí AKU - {tech['name']}",
                    value=f"{bat.get('voltageV', 0)} V", # Předvyplníme nominální
                    unit="V",
                    verdict="Vyhovuje"
                ))

        # Standardní měření pro EZS (vždy přítomné)
        measurements.insert(0, ReportMeasurement(id=str(uuid.uuid4()), label="Impedance přívodu", value="", unit="Ohm", verdict="Vyhovuje"))
        measurements.insert(1, ReportMeasurement(id=str(uuid.uuid4()), label="Izolační stav", value="", unit="MOhm", verdict="Vyhovuje"))

    # 4. Předmět revize
    subject = obj_doc.get("technicalDescription")
    if not subject:
        subject = f"Předmětem revize je systém {report_type} instalovaný v objektu {obj_doc['name']}."

    # 5. Sestavení objektu
    new_report = ServiceReport(
        id=uuid.uuid4().hex,
        objectId=obj_id,
        reportNumber=report_number,
        type=report_type,
        status="DRAFT",
        dateExecution=now.strftime("%Y-%m-%d"),
        dateIssue=now.strftime("%Y-%m-%d"),
        dateNext=(now + timedelta(days=365)).strftime("%Y-%m-%d"), # Default 1 rok
        technicianName=user["name"],
        technicianCertificate=user.get("certificateNumber", ""),
        supplierInfo=supplier_info,
        customerInfo=customer_info,
        objectAddress=obj_doc["address"],
        subject=subject,
        deviceList=device_list,
        measurements=measurements,
        defects=[],
        conclusion="Zařízení je schopno bezpečného provozu.",
        createdAt=now.isoformat(),
        updatedAt=now.isoformat()
    )
    
    await db.reports.insert_one(new_report.dict())
    return new_report

@app.get("/reports")
async def get_reports(objectId: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if objectId: query["objectId"] = objectId
    
    cursor = db.reports.find(query).sort("createdAt", -1)
    return [fix_mongo_id(doc) async for doc in cursor]

@app.get("/reports/{report_id}")
async def get_report(report_id: str, user: dict = Depends(get_current_user)):
    doc = await db.reports.find_one({"id": report_id})
    if not doc: raise HTTPException(404, "Report not found")
    return fix_mongo_id(doc)

@app.put("/reports/{report_id}")
async def update_report(report_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    updates["updatedAt"] = datetime.now().isoformat()
    
    # Ochrana: Neměnit ID a číslo
    if "id" in updates: del updates["id"]
    if "_id" in updates: del updates["_id"]
    
    res = await db.reports.update_one({"id": report_id}, {"$set": updates})
    if res.matched_count == 0: raise HTTPException(404, "Report not found")
    return {"status": "updated"}

@app.post("/reports/{report_id}/clone")
async def clone_report(report_id: str, user: dict = Depends(get_current_user)):
    """Kopie existující revize (např. z minulého roku)"""
    old_report = await db.reports.find_one({"id": report_id})
    if not old_report: raise HTTPException(404, "Report not found")
    
    now = datetime.now()
    new_number = await generate_report_number(now.year)
    
    new_report = old_report.copy()
    new_report["id"] = uuid.uuid4().hex
    del new_report["_id"]
    
    # Aktualizace datumu a čísla
    new_report["reportNumber"] = new_number
    new_report["dateExecution"] = now.strftime("%Y-%m-%d")
    new_report["dateIssue"] = now.strftime("%Y-%m-%d")
    new_report["dateNext"] = (now + timedelta(days=365)).strftime("%Y-%m-%d")
    new_report["status"] = "DRAFT"
    new_report["createdAt"] = now.isoformat()
    new_report["updatedAt"] = now.isoformat()
    new_report["technicianName"] = user["name"]
    
    # Reset naměřených hodnot (labely zůstanou, hodnoty se smažou)
    for m in new_report.get("measurements", []):
        m["value"] = "" 
        
    await db.reports.insert_one(new_report)
    return fix_mongo_id(new_report)

@app.delete("/reports/{report_id}")
async def delete_report(report_id: str, user: dict = Depends(get_current_user)):
    await db.reports.delete_one({"id": report_id})
    return {"status": "deleted"}

@app.get("/reports/{report_id}/pdf")
async def generate_pdf(report_id: str):
    doc = await db.reports.find_one({"id": report_id})
    if not doc: raise HTTPException(404, "Report not found")
    
    # Zde by byla integrace WeasyPrint. Prozatím vracíme HTML náhled.
    # V produkci: import weasyprint ...
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: DejaVu Sans, sans-serif; padding: 40px; color: #333; }}
            .header {{ text-align: center; border-bottom: 2px solid #333; margin-bottom: 20px; padding-bottom: 10px; }}
            h1 {{ font-size: 24px; margin: 0; }}
            h2 {{ font-size: 16px; margin: 5px 0 0; color: #666; }}
            
            .section {{ margin-bottom: 20px; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
            
            .box {{ border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #f9f9f9; }}
            .box h3 {{ margin-top: 0; font-size: 14px; text-transform: uppercase; color: #555; }}
            
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }}
            th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; }}
            th {{ background: #eee; }}
            
            .footer {{ margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>ZPRÁVA O REVIZI {doc.get('type')}</h1>
            <h2>Číslo protokolu: {doc.get('reportNumber')}</h2>
        </div>
        
        <div class="grid section">
            <div class="box">
                <h3>Objednatel</h3>
                <p><strong>{doc.get('customerInfo', {}).get('name')}</strong></p>
                <p>IČ: {doc.get('customerInfo', {}).get('ico', '-')}</p>
                <p>{doc.get('customerInfo', {}).get('address', {}).get('street')}</p>
            </div>
            <div class="box">
                <h3>Dodavatel (Servis)</h3>
                <p><strong>{doc.get('supplierInfo', {}).get('name')}</strong></p>
                <p>IČ: {doc.get('supplierInfo', {}).get('ico')}</p>
                <p>{doc.get('supplierInfo', {}).get('address', {}).get('street')}</p>
            </div>
        </div>

        <div class="section">
             <h3>Předmět revize</h3>
             <p>{doc.get('subject')}</p>
        </div>

        <div class="section">
            <h3>Měření a zkoušky</h3>
            <table>
                <tr>
                    <th style="width: 50%">Měření</th>
                    <th>Hodnota</th>
                    <th>Verdikt</th>
                </tr>
                {''.join([f"<tr><td>{m['label']}</td><td><strong>{m['value']}</strong> {m.get('unit','')}</td><td>{m['verdict']}</td></tr>" for m in doc.get('measurements', [])])}
            </table>
        </div>
        
        <div class="section box" style="background: #fff; border-color: #333;">
            <h3>Celkový posudek</h3>
            <p style="font-size: 14px; font-weight: bold;">{doc.get('conclusion')}</p>
        </div>

        <div class="footer grid">
            <div>
                Datum provedení: {doc.get('dateExecution')}<br/>
                Příští revize: <strong>{doc.get('dateNext')}</strong>
            </div>
            <div style="text-align: right;">
                Technik: {doc.get('technicianName')}<br/>
                Osvědčení: {doc.get('technicianCertificate') or '-'}
            </div>
        </div>
    </body>
    </html>
    """
    
    return StreamingResponse(io.BytesIO(html_content.encode('utf-8')), media_type="text/html")

# ==========================================
# --- OSTATNÍ EXISTUJÍCÍ ENDPOINTY ---
# ==========================================

@app.get("/groups")
async def get_groups(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.groups.find({})]

@app.post("/groups")
async def create_group_or_bulk(data: Any = Body(...), user: dict = Depends(get_current_user)):
    if isinstance(data, list):
        await db.groups.delete_many({})
        if data: await db.groups.insert_many(data)
        return {"status": "bulk_saved"}
    else:
        if "id" not in data: data["id"] = uuid.uuid4().hex
        await db.groups.insert_one(data)
        return {"status": "created"}

@app.delete("/groups/{group_id}")
async def delete_group(group_id: str, user: dict = Depends(get_current_user)):
    await db.groups.delete_one({"id": group_id})
    return {"status": "deleted"}

@app.patch("/groups/{group_id}")
async def update_group(group_id: str, updates: dict = Body(...), user: dict = Depends(get_current_user)):
    if "id" in updates: del updates["id"]
    if "_id" in updates: del updates["_id"]
    result = await db.groups.update_one({"id": group_id}, {"$set": updates})
    if result.matched_count == 0: raise HTTPException(404, "Group not found")
    return {"status": "updated"}

@app.get("/templates")
async def get_templates(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.templates.find({})]

@app.post("/templates")
async def save_templates(templates: List[dict] = Body(...), user: dict = Depends(get_current_user)):
    await db.templates.delete_many({})
    if templates: await db.templates.insert_many(templates)
    return {"status": "saved"}

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
    data = {
        "objects": [fix_mongo_id(d) async for d in db.objects.find({})],
        "groups": [fix_mongo_id(d) async for d in db.groups.find({})],
        "templates": [fix_mongo_id(d) async for d in db.templates.find({})],
        "users": [fix_mongo_id(d) async for d in db.users.find({})],
        "settings": [fix_mongo_id(d) async for d in db.settings.find({})],
        "reports": [fix_mongo_id(d) async for d in db.reports.find({})],
        "battery_types": [fix_mongo_id(d) async for d in db.battery_types.find({})]
    }

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("data.json", json.dumps(data, cls=JSONEncoder, indent=2))
        if os.path.exists(UPLOAD_DIR):
            for root, dirs, files in os.walk(UPLOAD_DIR):
                for file in files:
                    file_path = os.path.join(root, file)
                    zip_file.write(file_path, os.path.join("uploads", file))

    zip_buffer.seek(0)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=batteryguard_backup_{timestamp}.zip"}
    )

@app.post("/backup/import")
async def import_backup(file: UploadFile = File(...), user: dict = Depends(get_current_admin)):
    if not file.filename.endswith(".zip"): raise HTTPException(400, "Must be ZIP")
    try:
        content = await file.read()
        zip_buffer = io.BytesIO(content)
        with zipfile.ZipFile(zip_buffer, "r") as zip_file:
            if "data.json" not in zip_file.namelist(): raise HTTPException(400, "Missing data.json")
            json_data = json.loads(zip_file.read("data.json").decode("utf-8"))
            
            # Vymazání současných dat
            await db.objects.delete_many({})
            await db.groups.delete_many({})
            await db.templates.delete_many({})
            await db.users.delete_many({})
            await db.settings.delete_many({})
            await db.reports.delete_many({})
            await db.battery_types.delete_many({})

            # Vložení dat
            if json_data.get("objects"): await db.objects.insert_many(json_data["objects"])
            if json_data.get("groups"): await db.groups.insert_many(json_data["groups"])
            if json_data.get("templates"): await db.templates.insert_many(json_data["templates"])
            if json_data.get("users"): await db.users.insert_many(json_data["users"])
            if json_data.get("settings"): await db.settings.insert_many(json_data["settings"])
            if json_data.get("reports"): await db.reports.insert_many(json_data["reports"])
            if json_data.get("battery_types"): await db.battery_types.insert_many(json_data["battery_types"])

            # Obnovení souborů
            if os.path.exists(UPLOAD_DIR):
                shutil.rmtree(UPLOAD_DIR)
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            for member in zip_file.namelist():
                if member.startswith("uploads/") and not member.endswith("/"):
                    filename = os.path.basename(member)
                    if filename:
                        target_path = os.path.join(UPLOAD_DIR, filename)
                        with open(target_path, "wb") as f:
                            f.write(zip_file.read(member))
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, f"Restore failed: {str(e)}")

# QR KÓD
@app.get("/qr/object/{obj_id}")
async def get_object_qr(obj_id: str): 
    doc = await db.objects.find_one({"id": obj_id})
    if not doc: raise HTTPException(404, "Object not found")
    target_url = f"{PUBLIC_URL}/#/object/{obj_id}"
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=StyledPilImage, module_drawer=RoundedModuleDrawer())
    img_buffer = io.BytesIO()
    img.save(img_buffer, format="PNG")
    img_buffer.seek(0)
    from urllib.parse import quote
    base_name = doc.get('name', 'object').replace(' ', '_')
    safe_name = "".join([c for c in base_name if c.isalnum() or c in ('_', '-')])
    encoded_filename = quote(f"qr_{safe_name}.png")
    return StreamingResponse(img_buffer, media_type="image/png", headers={"Content-Disposition": f"inline; filename*=UTF-8''{encoded_filename}"})

# BATTERY TYPES
@app.get("/battery-types")
async def get_battery_types_endpoint(user: dict = Depends(get_current_user)):
    return [fix_mongo_id(d) async for d in db.battery_types.find({})]

@app.post("/battery-types")
async def create_battery_type_endpoint(bt: dict = Body(...), user: dict = Depends(get_current_admin)):
    if "id" not in bt: bt["id"] = uuid.uuid4().hex
    await db.battery_types.insert_one(bt)
    return fix_mongo_id(bt)

@app.delete("/battery-types/{bt_id}")
async def delete_battery_type_endpoint(bt_id: str, user: dict = Depends(get_current_admin)):
    await db.battery_types.delete_one({"id": bt_id})
    return {"status": "deleted"}

# USERS
@app.get("/users")
async def get_all_users_endpoint(user: dict = Depends(get_current_admin)):
    users = []
    async for doc in db.users.find({}):
        doc.pop("hashed_password", None)
        users.append(fix_mongo_id(doc))
    return users

@app.post("/users")
async def create_user_admin_endpoint(req: dict = Body(...), user: dict = Depends(get_current_admin)):
    if await db.users.find_one({"email": req.get("email")}): raise HTTPException(400, "Exists")
    raw_password = req.get("password") or "batteryguard123"
    new_user = {
        "id": uuid.uuid4().hex, "name": req.get("name", "Neznámý"), "email": req.get("email"),
        "role": req.get("role", "TECHNICIAN"), "isAuthorized": True,
        "hashed_password": get_password_hash(raw_password), "createdAt": datetime.utcnow().isoformat()
    }
    await db.users.insert_one(new_user)
    new_user.pop("hashed_password", None)
    return fix_mongo_id(new_user)

@app.patch("/users/{user_id}/password")
async def admin_change_user_password(user_id: str, body: dict = Body(...), user: dict = Depends(get_current_admin)):
    new_password = body.get("newPassword")
    if not new_password: raise HTTPException(400, "Required")
    result = await db.users.update_one({"id": user_id}, {"$set": {"hashed_password": get_password_hash(new_password)}})
    if result.matched_count == 0: raise HTTPException(404, "Not found")
    return {"status": "password_updated"}

@app.patch("/auth/password")
async def change_self_password(body: dict = Body(...), user: dict = Depends(get_current_user)):
    current_password, new_password = body.get("currentPassword"), body.get("newPassword")
    full_user = await db.users.find_one({"email": user["email"]})
    if not verify_password(current_password, full_user["hashed_password"]): raise HTTPException(400, "Invalid password")
    await db.users.update_one({"email": user["email"]}, {"$set": {"hashed_password": get_password_hash(new_password)}})
    return {"status": "password_changed"}


from models import MeasurementDefinition # Ujistěte se, že je importováno nahoře

@app.get("/settings/measurements")
async def get_measurement_settings(user: dict = Depends(get_current_user)):
    doc = await db.settings.find_one({"id": "measurement_defs"})
    if not doc:
        # Defaultní nastavení, pokud v DB nic není
        return [
            {"deviceType": "BATTERY", "measurements": ["Napětí (V)", "Kapacitní zkouška", "Vnitřní odpor"]},
            {"deviceType": "EPS_CENTRAL", "measurements": ["Zkouška záložního zdroje", "Test poplachu"]}
        ]
    return doc.get("definitions", [])

@app.post("/settings/measurements")
async def save_measurement_settings(defs: List[MeasurementDefinition], user: dict = Depends(get_current_user)):
    # Povolíme úpravu jen adminovi, nebo všem (podle potřeby)
    if user.get("role") != "ADMIN": raise HTTPException(403, "Only admin")
    
    await db.settings.update_one(
        {"id": "measurement_defs"},
        {"$set": {"definitions": [d.dict() for d in defs]}},
        upsert=True
    )
    return {"status": "saved"}


@app.on_event("startup")
async def startup_db_client():
    if not await db.users.find_one({}):
        await db.users.insert_one({
            "id": "admin", "name": "Admin", "email": ADMIN_EMAIL, "role": "ADMIN", 
            "isAuthorized": True, "hashed_password": get_password_hash(ADMIN_PASSWORD)
        })
    if not await db.templates.find_one({}):
        await db.templates.insert_many([
             {"id": "t-service", "name": "Servisní zásah", "icon": "Wrench", "fields": [{"id": "f1", "label": "Popis", "type": "textarea", "required": True}]},
        ])