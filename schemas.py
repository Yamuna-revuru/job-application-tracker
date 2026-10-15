
from datetime import date
from typing import Optional

from pydantic import BaseModel


class JobApplicationCreate(BaseModel):
    company_name: str
    job_title: str
    application_date: date
    status: str = "Applied"
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None


class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    application_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
