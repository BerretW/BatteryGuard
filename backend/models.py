from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

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

class Technology(BaseModel):
    id: str
    name: str
    type: str
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
    images: List[str] = [] # PŘIDÁNO: Seznam URL obrázků



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
    groupId: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    files: List[FileAttachment] = [] 
    pendingIssues: List[Any] = [] # Pro zpětnou kompatibilitu pendingIssues

class ObjectGroup(BaseModel):
    id: str
    name: str
    color: Optional[str] = None

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

