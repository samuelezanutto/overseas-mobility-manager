# Overseas Mobility Manager

Web application for managing student overseas mobility programs at Ca' Foscari University.

Built as a project for the *Tecnologie e Applicazioni Web* course, a.y. 2025/2026.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose
- **Frontend**: Angular (SPA)
- **Auth**: JWT
- **Infrastructure**: Docker

## Project Structure

\```
overseas-app/
├── backend/    # REST API server
└── frontend/   # Angular SPA
\```

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB
- Docker (for containerized setup)

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend/overseas-frontend
npm install
ng serve
```