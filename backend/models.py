from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# ==========================================
# --- POMOCNÉ MODELY PRO REVIZE (NOVÉ) ---
# ==========================================

class Address(BaseModel):
    street: str
    city: str
    zipCode: str
    country: Optional[str] = "CZ"

class BillingInfo(BaseModel):
    name: str           # Název firmy (např. ČSOB a.s.)
    ico: str
    dic: Optional[str] = None
    address: Address
    isVatPayer: bool = True

# ==========================================
# --- EXISTUJÍCÍ MODELY (S ROZŠÍŘENÍM) ---
# ==========================================

class BatteryTypeModel(BaseModel):
    id: str
    name: str          # Např. "Yuasa NPL 17-12"
    manufacturer: str  # Např. "Yuasa"
    capacityAh: float  # 17
    voltageV: float    # 12
    technology: Optional[str] = "VRLA" # Volitelné (GEL, AGM...)

class Battery(BaseModel):
    id: str
    capacityAh: float
    voltageV: float
    installDate: str
    lastCheckDate: str
    nextReplacementDate: str
    status: str
    serialNumber: Optional[str] = None
    manufactureDate: Optional[str] = None
    notes: Optional[str] = None
    # NOVÉ (volitelné): Odkaz na typ z katalogu
    typeId: Optional[str] = None 

class Technology(BaseModel):
    id: str
    name: str
    type: str           # EPS, EZS, CCTV...
    deviceType: Optional[str] = "Zařízení" # Ústředna, Zdroj... (Optional pro zpětnou kompatibilitu)
    location: str
    batteries: List[Battery] = []

class FileAttachment(BaseModel):
    id: str
    name: str
    url: str
    type: str  # 'pdf', 'doc', 'image', 'other'
    size: Optional[int] = 0
    uploadedAt: str
    uploadedBy: str
    # NOVÉ (volitelné): Kategorie souboru (Revize, Projekt...)
    category: Optional[str] = "OTHER" 

class Contact(BaseModel):
    id: str
    name: str
    role: str
    phone: str
    email: str

class LogEntry(BaseModel):
    id: str
    templateId: str
    templateName: str
    date: str
    author: str
    data: Dict[str, Any]
    images: List[str] = [] 

class ObjectTask(BaseModel):
    id: str
    description: str      # Úkol
    deadline: str         # Termín
    priority: str         # LOW, MEDIUM, HIGH
    status: str           # OPEN, IN_PROGRESS, DONE
    note: Optional[str] = None
    createdAt: str
    createdBy: str

class RegularEvent(BaseModel):
    id: str
    title: str
    startDate: str
    nextDate: str
    interval: str
    description: Optional[str] = None
    futureNotes: Optional[str] = None
    isActive: bool
    precisionOnDay: bool

class ObjectGroup(BaseModel):
    id: str
    name: str
    color: Optional[str] = None
    defaultBatteryLifeMonths: Optional[int] = 24
    notificationLeadTimeWeeks: Optional[int] = 4
    # NOVÉ: Fakturační údaje skupiny (zákazníka) pro revize
    billingInfo: Optional[BillingInfo] = None 

class BuildingObject(BaseModel):
    id: str
    name: str
    address: str
    description: str
    internalNotes: Optional[str] = None
    
    tasks: List[ObjectTask] = [] 
    contacts: List[Contact] = []
    technologies: List[Technology] = []
    logEntries: List[LogEntry] = []
    scheduledEvents: List[RegularEvent] = []
    files: List[FileAttachment] = [] 
    pendingIssues: List[Any] = [] # Pro zpětnou kompatibilitu pendingIssues
    
    groupId: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    # NOVÉ: Technický popis pro revize (aby se nemusel psát znovu při každé revizi)
    technicalDescription: Optional[str] = None 

# ==========================================
# --- NOVÉ MODELY PRO REVIZE A NASTAVENÍ ---
# ==========================================

class CompanySettings(BaseModel):
    """Globální nastavení Vaší firmy (Dodavatel)"""
    id: str = "global_settings"
    name: str                   # EL-SIGNÁL s.r.o.
    address: Address
    ico: str
    dic: str
    phone: str
    email: str
    web: Optional[str] = None
    logoUrl: Optional[str] = None 
    bankAccount: Optional[str] = None

class ReportMeasurement(BaseModel):
    """Jeden řádek měření v protokolu"""
    id: str
    label: str          # Např. "Impedance přívodu"
    value: str          # Např. "1,05 ohm"
    unit: Optional[str] = None
    verdict: str        # "Vyhovuje"
    isHeader: bool = False
    info: Optional[str] = None # <--- NOVÉ POLE (pro datum instalace atd.)

class ServiceReport(BaseModel):
    """Datový model pro Servisní zprávu / Revizi"""
    id: str
    objectId: str
    reportNumber: str       # 52/2025
    type: str               # "REVIZE_EZS", "KONTROLA_EPS"...
    status: str             # "DRAFT", "FINAL"
    
    # Datumy
    dateExecution: str      
    dateIssue: str          
    dateNext: str           

    # Osoby
    technicianName: str
    technicianCertificate: Optional[str] = None
    
    # Snapshoty (Data v čase vytvoření)
    supplierInfo: CompanySettings       
    customerInfo: Optional[BillingInfo] 
    objectAddress: str                  
    
    # Obsah
    subject: str            
    deviceList: List[str]   
    
    # Dynamická data
    measurements: List[ReportMeasurement] = []
    defects: List[Dict[str, str]] = []  
    conclusion: str         
    
    createdAt: str
    updatedAt: str

# ==========================================
# --- AUTH MODELY (S ROZŠÍŘENÍM) ---
# ==========================================

class UserAuth(BaseModel):
    email: EmailStr
    password: str

class UserDB(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    isAuthorized: bool
    hashed_password: str
    createdAt: str
    # NOVÉ: Číslo osvědčení technika pro revize
    certificateNumber: Optional[str] = None 
    tools: List[str] = [] # Seznam měřáků

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    isAuthorized: bool
    createdAt: Optional[str] = None

class MeasurementDefinition(BaseModel):
    deviceType: str       # "BATTERY", "EPS_CENTRAL"
    measurements: List[str] # ["Napětí", "Kapacita"]