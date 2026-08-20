# ClubsForKids

A full-stack web application that automates after-school enrichment club enrollment for elementary schools — replacing a manual, paper-based lottery system with a fair, transparent digital process for registration, assignment, attendance, and communication.

Built for Plantation Park Elementary School to serve 500+ families across three user roles: **Parents**, **Teachers**, and a school **Coordinator**. This repository is shared publicly as a portfolio piece — see [About This Project](#about-this-project) below for details.

## Screenshots

### Coordinator Dashboard
![Coordinator Dashboard](images/coordinator_dashboard.png)

### Teacher Dashboard
![Teacher Dashboard](images/teacher_dashboard.png)

### Parent Dashboard
![Parent Dashboard](images/parent_dashboard.png)

---

## The Problem

Plantation Park Elementary ran its after-school club sign-ups entirely on paper — parents filled out forms, staff manually sorted lottery entries, tracked attendance on clipboards, and absence excuses were phone calls or notes sent in backpacks. This didn't scale well past a few hundred families and left no digital record of enrollment, attendance, or communication.

## The Solution

ClubsForKids digitizes the entire workflow: online registration with ranked club preferences, an automated lottery algorithm that fairly assigns spots while keeping siblings together, daily attendance tracking, a structured excuse-submission and approval process, and a full in-app messaging system connecting parents, teachers, and the coordinator.

---

## Features

### For Parents
- Register a family and add children, with club choices ranked by preference
- Real-time dashboard showing enrollment status, upcoming club meetings, and pickup logistics
- Manage authorized pickup contacts
- Submit excuse letters for absences (with a 3-day submission deadline)
- Message their child's teacher directly

### For Teachers
- View their club's full roster, including student contacts and authorized pickups
- Take daily attendance (Present / Absent / Excused / Late Pickup)
- Review attendance history for any scheduled meeting date
- Message the coordinator or individual parents; send class-wide announcements

### For the Coordinator
- Set up clubs, create teacher accounts, and run the enrollment lottery
- Review and approve/deny submitted excuse letters
- Full roster management, including the ability to revoke a specific parent's access to a child's information (e.g. custody or safety situations) without deleting their account
- Bulk import students and homeroom teachers via spreadsheet upload
- Generate printable reports — by club, or grouped by homeroom teacher (for handing off enrollment lists to classroom teachers)
- Send targeted announcements (a specific club's parents, all families, all teachers)
- Automated duplicate-registration detection
- Lock registration once the enrollment deadline passes

### Platform-wide
- Fully responsive — works cleanly on desktop and mobile, including an adaptive messaging interface and collapsible navigation
- Real-time unread message and pending-action badges
- Role-based access control enforced at the API level, not just hidden in the UI

---

## Tech Stack

**Backend:** Python · FastAPI · SQLAlchemy · SQLite (PostgreSQL-ready) · JWT authentication · bcrypt · slowapi (rate limiting)

**Frontend:** React · Vite · React Router · Axios · lucide-react

**Architecture:** Decoupled REST API — the frontend and backend communicate exclusively over HTTP, meaning the same backend can (and will) power a native mobile app with zero backend changes.

---

## Architecture Overview

┌─────────────┐ HTTP/JSON ┌──────────────┐ ┌────────────┐
│ React │ ─────────────────────────▶ │ FastAPI │ ──────▶ │ Database │
│ (Frontend) │ ◀───────────────────────── │ (Backend) │ ◀────── │ (SQLite/PG) │
└─────────────┘ JWT-authenticated └──────────────┘ └────────────┘


- **`models/`** — SQLAlchemy table definitions
- **`core/auth.py`** — password hashing, JWT issuance/validation, role-based dependency injection
- **`routers/`** — API endpoints, grouped by resource (auth, lottery, attendance, messages, etc.)
- **`frontend/src/pages/`** — one component per screen, organized by role
- **`frontend/src/api/axios.js`** — shared HTTP client with automatic JWT attachment

---

## Notable Engineering Challenges

A few problems worth highlighting from the build process:

- **Lottery fairness bug** — discovered that batching database commits during sibling assignment allowed stale enrollment counts to be read mid-lottery, occasionally letting a club exceed its capacity. Fixed by committing after each individual assignment.
- **React re-render/focus bug** — a component defined inside another component's render function was being recreated on every keystroke, causing input fields to lose focus. Fixed by hoisting shared sub-components out to module scope.
- **FastAPI route-ordering bug** — wildcard routes (e.g. `/{id}`) were unintentionally matching literal paths defined later in the file (e.g. `/my-teachers`), since FastAPI matches routes in declaration order. Solved by establishing a convention of literal routes before wildcard routes.
- **Security audit** — proactively identified and removed a leftover development endpoint capable of deleting all production data with a single unauthenticated-adjacent request, before it could ever reach a live environment.

---

## Getting Started

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\Activate.ps1        # Windows
# source venv/bin/activate       # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

SECRET_KEY=your-secret-key-here


```bash
uvicorn main:app --reload
```
API docs available at `http://127.0.0.1:8000/docs`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App available at `http://localhost:5173`

---

## Roadmap

- [x] Web application — full feature set across all three roles
- [x] Mobile-responsive web UI
- [x] Security hardening (rate limiting, secret management, CORS, audit)
- [ ] Native mobile apps (Expo/React Native) — in progress
- [ ] Production deployment (PostgreSQL migration, hosting)
- [ ] Push notifications

---

## About This Project

ClubsForKids was built for Plantation Park Elementary School to replace their manual, paper-based after-school club enrollment process. This repository is shared publicly to demonstrate the technical work involved — please do not deploy, redistribute, or reuse this code without permission.

If you're interested in learning more about the project or discussing it, feel free to reach out:

- **Email:** NicolasBanos01@gmail.com
- **LinkedIn:** [linkedin.com/in/nicolas-banos-855b612a6](https://www.linkedin.com/in/nicolas-banos-855b612a6)