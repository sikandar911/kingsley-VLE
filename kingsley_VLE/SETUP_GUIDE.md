# Kingsley VLE - Project Setup Guide

This guide will walk you through setting up the Kingsley Virtual Learning Environment (VLE) project step by step after cloning from GitHub.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - verify with `npm --version`
- **Git** - [Download here](https://git-scm.com/)
- **PostgreSQL** (v12 or higher) - The database is already set up at `62.169.25.212:5433`

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd kingsley_VLE
```

## Step 2: Project Structure Overview

The project is organized as follows:

```
kingsley_VLE/
├── client/                 # React + Vite frontend
├── server/                # Express backend
├── .github/               # GitHub workflows and configs
├── README.md              # Project documentation
└── SETUP_GUIDE.md         # This file
```

## Step 3: Setup Environment Variables

### Server Configuration

1. Navigate to the server folder:
   ```bash
   cd server
   ```

2. Create a `.env` file in the server folder:
   ```bash
   # On Windows
   type nul > .env
   
   # On macOS/Linux
   touch .env
   ```

3. Add the following environment variables to `.env`:
   ```
   DATABASE_URL="postgresql://root:Paglaschool321@62.169.25.212:5433/vle_test?schema=public"
   JWT_SECRET=kingsleyVLE_super_secret_jwt_key_2026_change_in_production
   JWT_EXPIRY=24h
   PORT=5000
   NODE_ENV=development
   ```

   > ⚠️ **Security Note:** Change the `JWT_SECRET` to a strong random string in production environments.

## Step 4: Install Server Dependencies

While still in the server folder:

```bash
npm install
```

This will install all required packages including:
- Express.js (web framework)
- Prisma (ORM)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)
- swagger-jsdoc & swagger-ui-express (API documentation)
- cors (cross-origin requests)
- dotenv (environment variables)

**Expected output:** "added X packages"

## Step 5: Setup the Database with Prisma

### Initialize Prisma and Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run database migration
npx prisma migrate dev --name "init"
```

This will:
- Connect to the PostgreSQL database
- Create all required tables (users, courses, assignments, etc.)
- Generate the Prisma Client for use in the application

**Expected output:** "✓ Your database has been successfully migrated"

### Verify the Database Setup

You can view the database structure anytime by running:

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555`.

## Step 6: Seed Admin Credentials

Create the default admin accounts for testing purposes:

```bash
node prisma/seed.js
```

**Expected output:**
```
✅ Admin created: admin@system.edu / Admin@123456
✅ Admin created: backup_admin@system.edu / BackupAdmin@123456
```

Save these credentials securely. You'll use them to log in for the first time.

## Step 7: Start the Backend Server

While still in the server folder, start the development server:

```bash
npm run dev
```

**Expected output:**
```
🚀 Server running at http://localhost:5000
📚 Swagger docs at http://localhost:5000/api/docs
```

> **Keep this terminal open.** The server must be running for the frontend to communicate with the API.

## Step 8: Install and Start the Frontend

Open a **new terminal window** and navigate to the client folder:

```bash
cd client
```

### Install Client Dependencies

```bash
npm install
```

This will install:
- React 18 (UI library)
- Vite 5 (build tool and dev server)
- React Router v6 (routing)
- Axios (HTTP client)
- Tailwind CSS v3 (styling framework)

**Expected output:** "up to date, audited X packages"

### Start the Frontend Development Server

```bash
npm run dev
```

**Expected output:**
```
✔ Console Ninja extension is connected to Vite
VITE v5.4.21  ready in XXX ms
➜ Local:   http://localhost:5173/
```

> **Keep this terminal open.** The frontend dev server provides hot-reloading during development.

## Step 9: Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the **Kingsley VLE Login Page** with:
- Email/Username field
- Password field
- Login button

## Step 10: Login with Admin Credentials

### First-Time Login

1. Enter the admin email:
   ```
   admin@system.edu
   ```

2. Enter the admin password:
   ```
   Admin@123456
   ```

3. Click **Login**

You will be redirected to the **Admin Dashboard** where you can:
- View overall statistics (total students, teachers, courses)
- Create student accounts
- Create teacher accounts
- Edit user details
- Activate/deactivate users
- Delete users

## Step 11: Access API Documentation

The backend provides interactive API documentation using Swagger UI:

```
http://localhost:5000/api/docs
```

Visit this URL in your browser to explore all available API endpoints, their parameters, request/response formats, and test them directly.

## Troubleshooting

### Issue: "Route POST /auth/login not found"

**Solution:** The Vite proxy configuration may be misconfigured. Ensure `client/vite.config.js` has the correct proxy settings:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

Restart the frontend server after making changes.

### Issue: "Can't connect to the database"

**Solution:** 
1. Verify the database connection string in `server/.env`
2. Ensure PostgreSQL is running at `62.169.25.212:5433`
3. Check that the database `vle_test` exists
4. Verify your network connection can reach the database server

### Issue: Port 5000 or 5173 is already in use

**Solution:** The Vite dev server will automatically try the next available port (5174, 5175, etc.). Connect to the port shown in the terminal output.

### Issue: Dependencies won't install

**Solution:** 
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## Available Scripts

### Server Scripts

In the `server` folder:

```bash
npm run dev              # Start dev server with auto-reload
npm run build            # Build for production
npx prisma migrate dev   # Create and run migrations
npx prisma generate      # Generate Prisma Client
npx prisma studio       # Open Prisma Studio (visual DB browser)
npm run seed            # Seed database with demo data
```

### Client Scripts

In the `client` folder:

```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run lint             # Run ESLint (if configured)
```

## Project Architecture

### Frontend (React + Vite)

- **Location:** `client/src/`
- **Structure:** Organized by feature (Auth, Dashboard, Profile)
- **Styling:** Tailwind CSS v3
- **Routing:** React Router v6
- **State Management:** React Context API (Auth context)
- **API Communication:** Axios with interceptors for JWT token handling

### Backend (Express + Prisma)

- **Location:** `server/src/`
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT Bearer tokens with bcrypt password hashing
- **Authorization:** Role-based access control (RBAC)
- **Roles:** admin, student, teacher
- **API Docs:** Swagger/OpenAPI 3.0

### Database

- **Type:** PostgreSQL
- **Host:** 62.169.25.212
- **Port:** 5433
- **Database:** vle_test
- **Schema:** public

**Key Tables:**
- `User` - User accounts with authentication
- `StudentProfile` - Student-specific information
- `TeacherProfile` - Teacher-specific information
- `Course` - Course definitions
- `Enrollment` - Student course registrations
- `Assignment` - Course assignments
- `AssignmentSubmission` - Student submissions

## Default Test Accounts

After seeding, you have two admin accounts:

| Email | Password | Role |
|-------|----------|------|
| `admin@system.edu` | `Admin@123456` | Admin |
| `backup_admin@system.edu` | `BackupAdmin@123456` | Admin |

Use the admin panel to create student and teacher test accounts.

## Next Steps for Development

1. **Create Test Users:**
   - Log in as admin
   - Create a student account (email: `student@test.edu`)
   - Create a teacher account (email: `teacher@test.edu`)
   - Note the generated IDs for reference

2. **Test Role-Based Features:**
   - Log out and test student/teacher login
   - Verify role-specific dashboards and features

3. **Explore Features:**
   - View Admin Dashboard statistics
   - Update student/teacher profiles
   - Test profile update functionality

4. **Review Code:**
   - Check `client/src/App.jsx` for routing setup
   - Review `server/src/index.js` for API configuration
   - Examine `server/prisma/schema.prisma` for database structure

## Quick Reference Summary

```bash
# Terminal 1 - Backend
cd server
npm install
npx prisma migrate dev --name "init"
node prisma/seed.js
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev

# Access the app
# Frontend: http://localhost:5173
# API Docs: http://localhost:5000/api/docs
# Swagger Studio: http://localhost:5000/api/docs

# Login with
# Email: admin@system.edu
# Password: Admin@123456
```

## Need Help?

- **Documentation:** Check `README.md` in the project root
- **API Documentation:** Visit `http://localhost:5000/api/docs` when servers are running
- **Database Structure:** Run `npx prisma studio` to visualize the database
- **Server Logs:** Check the terminal where `npm run dev` is running in the server folder
- **Console Logs:** Open browser DevTools (F12) to see any frontend errors

---

**Happy coding!** 🚀

For questions or issues, contact the development team.
