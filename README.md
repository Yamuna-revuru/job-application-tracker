
# Job Application Tracker

A full-stack web application for organizing job applications, tracking recruitment progress, managing follow-ups, and monitoring deadlines from one dashboard.

## Overview

The Job Application Tracker helps job seekers manage their job search efficiently. It provides a centralized dashboard to maintain application records, track recruitment stages, search and filter applications, and review application statistics.

## Features

- **Application Management:** Create, view, update, and delete job applications.
- **Dashboard Analytics:** Monitor application statistics and job-search progress.
- **Search and Filtering:** Search applications and filter them by status.
- **Sorting:** Sort applications by date or company name.
- **Pagination:** Navigate application records across multiple pages.
- **CSV Export:** Export application data.
- **Follow-up Reminders:** Track applications that require follow-up.
- **Responsive Interface:** Frontend built with HTML, CSS, Bootstrap, and JavaScript.

## Technology Stack

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic

**Database**
- PostgreSQL

**Frontend**
- HTML
- CSS
- Bootstrap
- JavaScript

**Tools**
- Git and GitHub
- Visual Studio Code
- Pytest

## Project Structure

```text
job-application-tracker/
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── .gitignore
├── main.py
├── database.py
├── models.py
├── schemas.py
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.13 or compatible version
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Yamuna-revuru/job-application-tracker.git
cd job-application-tracker
```

### 2. Create a Virtual Environment

On Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
python -m pip install fastapi uvicorn sqlalchemy alembic pydantic-settings pytest "psycopg[binary]" python-dotenv
```

### 4. Configure PostgreSQL

Create a PostgreSQL database named `job_tracker`.

Create a `.env` file in the project root with your own database credentials:

```env
DATABASE_URL=postgresql+psycopg://USERNAME:PASSWORD@localhost:5432/job_tracker
```

Replace `USERNAME` and `PASSWORD` with your local PostgreSQL credentials.

**Security:** Never upload your `.env` file, database password, or other secrets to GitHub.

### 5. Start the Backend

```powershell
python -m uvicorn main:app --reload
```

API documentation:

http://127.0.0.1:8000/docs

### 6. Start the Frontend

Open a second terminal in the project root:

```powershell
python -m http.server 5500 --directory frontend
```

Open the application interface:

http://127.0.0.1:5500

## Learning Outcomes

This project demonstrates practical experience with REST API development, PostgreSQL database integration, frontend and backend communication, CRUD operations, data filtering and sorting, pagination, and version control.

## Future Improvements

- Add user authentication and individual accounts.
- Deploy the application online.
- Expand automated API and frontend tests.

## Author

**Yamuna Revuru**

- GitHub: https://github.com/Yamuna-revuru
- Project Repository: https://github.com/Yamuna-revuru/job-application-tracker
# job-application-tracker
A full-stack job application tracker built with FastAPI, PostgreSQL, SQLAlchemy, HTML, CSS, and JavaScript.
