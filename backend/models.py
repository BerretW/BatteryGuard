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
    contacts: List[Contact] = []
    technologies: List[Technology] = []
    logEntries: List[LogEntry] = []
    scheduledEvents: List[RegularEvent] = []
    groupId: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

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