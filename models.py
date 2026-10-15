
from sqlalchemy import Column, Integer, String, Date

from database import Base


class JobApplication(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(150), nullable=False)
    job_title = Column(String(150), nullable=False)
    application_date = Column(Date, nullable=False)
    status = Column(String(50), default="Applied", nullable=False)
    notes = Column(String(1000), nullable=True)
    follow_up_date = Column(Date, nullable=True)
