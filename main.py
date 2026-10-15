
from datetime import date, timedelta

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from schemas import JobApplicationCreate, JobApplicationUpdate
from database import engine, SessionLocal, Base
from models import JobApplication


app = FastAPI(title="Job Application Tracker")



# CORS configuration for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Create the database table
Base.metadata.create_all(bind=engine)


# Database session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "Welcome to the Job Application Tracker!"
    }


# Create a job application
@app.post("/applications")
def create_application(
    application: JobApplicationCreate,
    db: Session = Depends(get_db)
):
    new_application = JobApplication(
        company_name=application.company_name,
        job_title=application.job_title,
        application_date=application.application_date,
        status=application.status,
        notes=application.notes,
        follow_up_date=application.follow_up_date
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return {
        "message": "Job application added successfully!",
        "application": {
            "id": new_application.id,
            "company_name": new_application.company_name,
            "job_title": new_application.job_title,
            "application_date": new_application.application_date,
            "status": new_application.status,
            "notes": new_application.notes,
            "follow_up_date": new_application.follow_up_date
        }
    }


# Get all applications, with optional filters
@app.get("/applications")
def get_applications(
    status: str = None,
    search: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(JobApplication)

    if status:
        query = query.filter(
            JobApplication.status.ilike(status)
        )

    if search:
        query = query.filter(
            (JobApplication.company_name.ilike(f"%{search}%")) |
            (JobApplication.job_title.ilike(f"%{search}%"))
        )

    return query.order_by(
        JobApplication.application_date.desc(),
        JobApplication.id.desc()
    ).all()


# Update an application
@app.patch("/applications/{application_id}")
def update_application(
    application_id: int,
    application: JobApplicationUpdate,
    db: Session = Depends(get_db)
):
    existing_application = db.query(JobApplication).filter(
        JobApplication.id == application_id
    ).first()

    if existing_application is None:
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    update_data = application.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(existing_application, field, value)

    db.commit()
    db.refresh(existing_application)

    return {
        "message": "Job application updated successfully!",
        "application": {
            "id": existing_application.id,
            "company_name": existing_application.company_name,
            "job_title": existing_application.job_title,
            "application_date": existing_application.application_date,
            "status": existing_application.status,
            "notes": existing_application.notes,
            "follow_up_date": existing_application.follow_up_date
        }
    }


# Delete an application
@app.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    existing_application = db.query(JobApplication).filter(
        JobApplication.id == application_id
    ).first()

    if existing_application is None:
        raise HTTPException(
            status_code=404,
            detail="Job application not found"
        )

    db.delete(existing_application)
    db.commit()

    return {
        "message": "Job application deleted successfully!",
        "id": application_id
    }


# Get application statistics
@app.get("/applications/stats")
def get_application_stats(
    db: Session = Depends(get_db)
):
    applications = db.query(JobApplication).all()

    total = len(applications)

    applied = sum(
        1 for application in applications
        if application.status.lower() == "applied"
    )

    interviews = sum(
        1 for application in applications
        if application.status.lower() in [
            "interview",
            "interview scheduled"
        ]
    )

    rejected = sum(
        1 for application in applications
        if application.status.lower() == "rejected"
    )

    offers = sum(
        1 for application in applications
        if application.status.lower() in [
            "offer",
            "offered"
        ]
    )

    return {
        "total_applications": total,
        "applied": applied,
        "interviews": interviews,
        "rejected": rejected,
        "offers": offers
    }


# Get overdue and upcoming follow-up reminders
@app.get("/applications/reminders")
def get_follow_up_reminders(
    db: Session = Depends(get_db)
):
    today = date.today()
    upcoming_limit = today + timedelta(days=7)

    applications = db.query(JobApplication).filter(
        JobApplication.follow_up_date.isnot(None)
    ).all()

    overdue = []
    upcoming = []

    for application in applications:
        # Exclude applications that are rejected or have offers
        if application.status.lower() in [
            "rejected",
            "offer",
            "offered"
        ]:
            continue

        item = {
            "id": application.id,
            "company_name": application.company_name,
            "job_title": application.job_title,
            "application_date": application.application_date,
            "status": application.status,
            "notes": application.notes,
            "follow_up_date": application.follow_up_date
        }

        if application.follow_up_date < today:
            overdue.append(item)

        elif today <= application.follow_up_date <= upcoming_limit:
            upcoming.append(item)

    # Sort reminders by follow-up date
    overdue.sort(key=lambda item: item["follow_up_date"])
    upcoming.sort(key=lambda item: item["follow_up_date"])

    return {
        "today": today,
        "overdue_count": len(overdue),
        "upcoming_count": len(upcoming),
        "overdue": overdue,
        "upcoming": upcoming
    }
