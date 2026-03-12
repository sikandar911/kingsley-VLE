# Copilot Instructions for Full-Stack React + Express + Prisma App

This is a full-stack application project with:

- Frontend: React with Vite and JavaScript
- Backend: Express.js
- Database: Prisma ORM

## Project Structure

```
.
├── client/               # React + Vite frontend
├── server/              # Express backend
├── .github/             # Workflow and configuration files
└── README.md            # Project documentation
```

## Getting Started

### Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Setup Database

```bash
# From the server folder
npm run prisma:migrate
npm run prisma:generate
```

### Development

```bash
# Terminal 1: Start backend server (from server folder)
npm run dev

# Terminal 2: Start frontend development server (from client folder)
npm run dev
```

### Build for Production

```bash
# Backend
cd server
npm run build

# Frontend
cd client
npm run build
```
