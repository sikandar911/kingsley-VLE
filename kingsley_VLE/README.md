# Kingsley VLE - Full-Stack Application

A modern full-stack application built with React + Vite for the frontend, Express.js for the backend, and Prisma ORM for database management.

## Features

- **Frontend**: React 18 with Vite for fast development and building
- **Backend**: Express.js server with RESTful APIs
- **Database**: Prisma ORM with support for PostgreSQL, MySQL, SQLite, and more
- **Development**: Configured with hot-module replacement (HMR) and development proxies
- **Production Ready**: Build scripts and optimized configurations for deployment

## Project Structure

```
.
├── client/                 # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx        # Main App component
│   │   ├── main.jsx       # React entry point
│   │   ├── App.css        # App styles
│   │   └── index.css      # Global styles
│   ├── index.html         # HTML entry point
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Frontend dependencies
│
├── server/                 # Express backend application
│   ├── src/
│   │   └── index.js       # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   ├── .env.example       # Environment variables template
│   └── package.json       # Backend dependencies
│
├── .github/
│   └── copilot-instructions.md  # Project documentation
│
└── README.md              # This file
```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- PostgreSQL, MySQL, or SQLite (for database)

## Getting Started

### 1. Install Dependencies

#### Install server dependencies
```bash
cd server
npm install
```

#### Install client dependencies
```bash
cd ../client
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the server directory with your database URL:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and update the `DATABASE_URL` with your database connection string:

```
# SQLite (for development)
DATABASE_URL="file:./dev.db"

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/kingsley_vle"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/kingsley_vle"
```

### 3. Setup Prisma Database

```bash
cd server

# Create database and run migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate
```

### 4. Development Server

#### Terminal 1 - Start backend server
```bash
cd server
npm run dev
```

The API server will run on `http://localhost:5000`

#### Terminal 2 - Start frontend development server
```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173` (or as shown in terminal)

## API Integration

The frontend is configured to proxy API requests to the backend. Any requests to `/api/*` will be forwarded to `http://localhost:5000`.

Example:
```javascript
// In your React component
const response = await fetch('/api/health')
const data = await response.json()
```

## Database Management

### Prisma Studio

Open an interactive database GUI to manage your data:

```bash
cd server
npm run prisma:studio
```

## Building for Production

### Frontend Build
```bash
cd client
npm run build
```

Output will be in `client/dist/`

### Backend Build
```bash
cd server
npm run build
```

## Available Scripts

### Server Scripts
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run prisma:migrate` - Create and apply database migrations
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:studio` - Open Prisma Studio

### Client Scripts
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Technology Stack

- **Frontend**
  - React 18
  - Vite
  - Axios (for HTTP requests)

- **Backend**
  - Express.js
  - Prisma ORM
  - CORS middleware

- **Database**
  - PostgreSQL (recommended)
  - MySQL
  - SQLite (development)
  - CockroachDB
  - SQL Server
  - MongoDB

## Environment Variables

### Server (.env)
```
DATABASE_URL="your_database_connection_string"
```

## Troubleshooting

- **Port already in use**: Change the PORT variable in `server/src/index.js` or `client/vite.config.js`
- **Database connection failed**: Verify your DATABASE_URL in `.env` file
- **Prisma issues**: Run `npm run prisma:generate` in the server directory

## License

ISC

## Contributing

Feel free to submit issues and enhancement requests!
