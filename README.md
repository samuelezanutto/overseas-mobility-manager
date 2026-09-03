# Overseas Mobility Manager

Web application for managing international student mobility programs — from application submission through document approval to final exam recognition.

Built as the exam project for *Tecnologie e Applicazioni Web*, Ca' Foscari University of Venice, a.y. 2025/2026.

---

## Overview

The Overseas program allows students to spend a period at a partner university abroad, take exams there, and have them recognized in their home study plan. This application digitizes the administrative workflow, which spans three phases and involves three distinct roles.

**Students** submit applications, map foreign courses to their home study plan, and upload the required documents.

**Referent lecturers** review applications, approve or reject Learning Agreements, and validate exam results on return.

**Overseas Office staff** monitor all applications, mark the pre-departure phase complete, and close applications at the end of the process.

Each role sees a different view of the same application, with actions gated by both role and ownership.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB with Mongoose |
| Frontend | Angular (standalone components, signals) |
| Auth | JSON Web Tokens |
| File uploads | Multer |
| Deployment | Docker Compose (three containers) |

---

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   frontend  │─────▶│   backend   │─────▶│    mongo    │
│   Angular   │      │   Express   │      │   MongoDB   │
│    nginx    │      │  REST API   │      │             │
└─────────────┘      └─────────────┘      └─────────────┘
     :80                  :3000              :27017
```

The frontend container serves the compiled Angular bundle through nginx, which also reverse-proxies API calls to the backend. Only port 80 is exposed to the host; backend and database communicate over the internal Docker network.

---

## Data Model

The design centres on a single `MobilityApplication` document that embeds everything belonging to it — exam mappings, uploaded documents, and proposed modifications. Users and institutions are separate collections referenced by ID.

```
User                    Institution
  └── referenced by       └── referenced by
        │                       │
        ▼                       ▼
MobilityApplication
  ├── mappings[]              exam correspondences (foreign ↔ home)
  │     └── result            score, date, approval status
  ├── learningAgreements[]    uploaded files with approval state
  ├── transcripts[]           transcript of records
  └── modifications[]         proposed changes to the exam plan
        └── proposedMappings[]
```

Exam mappings are never deleted. When a modification is approved, the previous mappings are flagged inactive and the new ones become active — preserving the full history of what changed and when.

---

## Application Workflow

```
  created
     │  student adds exam mappings, uploads Learning Agreement
     ▼
  awaiting_la_approval
     │  lecturer approves the Learning Agreement
     │  office verifies and marks pre-departure complete
     ▼
  pre_departure_completed
     │  student enters actual arrival and departure dates
     ▼
  mobility_in_progress
     │  student may propose changes to the exam plan
     │  lecturer approves or rejects each change
     │  student uploads Transcript of Records
     ▼
  waiting_score_approval
     │  lecturer records and approves each exam result
     │  office closes the application
     ▼
  closed
```

---

## Running the Application

**Requirements:** Docker and Docker Compose. Nothing else — Node, Angular, and MongoDB all run inside containers.

```bash
git clone https://github.com/samuelezanutto/overseas-mobility-manager.git
cd overseas-mobility-manager
docker compose up --build
```

The first build takes a few minutes. Once running, open **http://localhost**.

```bash
docker compose down        # stop
docker compose down -v     # stop and wipe the database
```

---

## Test Data

The backend seeds the database on first startup with partner institutions and six users covering all three roles. All accounts use the password `password123`.

| Role | Email |
|---|---|
| Student | `mario.rossi@stud.unive.it` |
| Student | `giulia.bianchi@stud.unive.it` |
| Student | `luca.ferrari@stud.unive.it` |
| Lecturer | `prof.bergamasco@unive.it` |
| Lecturer | `prof.focardi@unive.it` |
| Office staff | `ufficio.overseas@unive.it` |

To see the full workflow, log in as a student and create an application, then switch roles as the process requires.

---

## API

All endpoints except authentication require a `Bearer` token. Authorization is enforced twice: by role, and by ownership of the specific application.

**Authentication**

```
POST   /auth/register
POST   /auth/login
```

**Institutions and users**

```
GET    /institutions
GET    /institutions/:id
GET    /users/lecturers
```

**Applications**

```
POST   /applications                     create (student)
GET    /applications                     list, scoped by role
GET    /applications/:id                 detail
GET    /applications/:id/files/:name     download an uploaded document
```

**Workflow actions**

```
POST   /applications/:id/mappings                          add exam mappings
POST   /applications/:id/learning-agreement                upload document
PATCH  /applications/:id/learning-agreement/:laId/evaluate approve or reject
PATCH  /applications/:id/pre-departure                     mark phase complete
PATCH  /applications/:id/dates                             set mobility dates
POST   /applications/:id/modifications                     propose a change
PATCH  /applications/:id/modifications/:modId/evaluate     approve or reject
POST   /applications/:id/transcript                        upload transcript
PATCH  /applications/:id/mappings/:mappingId/result        record exam result
PATCH  /applications/:id/close                             close application
```

---

## Project Structure

```
overseas-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   └── src/
│       ├── index.ts            entry point, route mounting
│       ├── config.ts           JWT configuration
│       ├── db.ts               database connection
│       ├── seed.ts             test data
│       ├── models/             Mongoose schemas
│       ├── routes/             REST endpoints
│       └── middleware/         JWT verification
└── frontend/overseas-frontend/
    ├── Dockerfile
    └── src/app/
        ├── app.routes.ts
        ├── core/
        │   ├── services/       backend communication
        │   ├── guards/         route protection
        │   └── interceptors/   automatic token injection
        └── pages/              page components
```

---

## Notes on Security

Route guards in the frontend prevent unauthenticated users from reaching protected pages, but they are a usability measure, not a security boundary — the real enforcement is the JWT middleware on every backend route.

File downloads are checked against the requesting user: only the owning student, the referent lecturer, and office staff can retrieve a document belonging to an application.

The JWT secret is read from the environment, with a development default so the project runs out of the box. In production the application refuses to start without one, and the secret would be injected by the platform rather than committed.

---

## License

Academic project. Not intended for production use.
