<<<<<<< HEAD
# Event Alert & Management System

A secure, role-based real-time communication platform for event management. Features a Discord-style chat, live map tracking, and specialized controls for different roles (Admin, Organizer, Delegate, Volunteer, and Everyone).

---

## 🚀 Core Functionalities & How They Work

### 1. Role-Based Access Control (RBAC)
The project uses a secure, invitation-key system for authentication. 
- **How it works**: When an Admin creates a room, the backend generates unique, cryptographically secure keys for each role.
- **Roles**:
  - **Admin & Organizer**: Can create rooms, send targeted alerts, view the live team map, and manage settings.
  - **Delegate, Volunteer, & Everyone**: Join using a specific key. They can participate in the general chat and trigger panics.
- **Implementation**: Handled via JWT (JSON Web Tokens) for session management and AES-256-GCM for key encryption.

### 2. Discord-Style Real-Time Chat
A unified communication hub that feels and acts like Discord.
- **How it works**: A centralized `#general` channel where all participants can chat.
- **Features**:
  - **Message Grouping**: Consecutive messages from the same user within 5 minutes are grouped together.
  - **Role Avatars**: Every user has a color-coded avatar (e.g., Red for Admin, Blue for Organizer) with their role initial.
  - **Real-Time Updates**: The frontend polls the backend every 3 seconds to fetch new messages and alerts seamlessly.
- **Execution**: Messages are stored in the database and retrieved via the `/api/rooms/:roomId/alerts` endpoint.

### 3. Live Team Map & Manual Positioning
A dynamic map for tracking participant locations during the event.
- **How it works**: 
  - **Manual Mode**: Any user can click on the map to manually set their position.
  - **Team View**: Admins and Organizers see a "Live Map" with color-coded markers for all participants.
- **Auto-Refresh**: The map auto-refreshes every 5 seconds for power users.
- **Execution**: Uses **Leaflet.js** for the map interface and updates locations via the `/api/rooms/:roomId/location` endpoint.

### 4. Emergency Panic System
A high-priority alert system for immediate assistance.
- **How it works**: A prominent "EMERGENCY PANIC" button is available on the Home and Map pages.
- **Result**: Triggering a panic sends a red-highlighted message with a "⚠" icon to the entire room instantly.
- **Execution**: Handled via a dedicated `/api/rooms/:roomId/panic` POST route.

### 5. Official Role-Targeted Alerts
Admins and Organizers can send "Official" messages to specific groups.
- **How it works**: Using the "Send Official Alert" page, an Admin can choose to send a message only to "Volunteers" or "Delegates".
- **Execution**: The backend filters visibility so only the targeted role (and Admins) see these specific messages in their chat.

---

## 💻 Detailed Local Execution Guide (Windows)

Follow these steps to set up and run the project locally on your Windows system.

### 1. Prerequisites
Ensure you have the following installed:
- **Git**: [Download Git for Windows](https://git-scm.com/download/win)
- **Node.js (v18+)**: [Download Node.js](https://nodejs.org/)
- **Visual Studio Code**: [Download VS Code](https://code.visualstudio.com/)
- **Google Maps API Key**: Required for the map features.

### 2. Initial Setup
1. Open **PowerShell** or **Command Prompt** as Administrator.
2. Clone the repository:
   ```powershell
   git clone https://github.com/Pragnascode/event_.git
   cd event_
   ```

### 3. Backend Setup
1. Navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Generate the database client:
   ```powershell
   npx prisma generate
   ```
4. Run database migrations:
   ```powershell
   npx prisma migrate dev --name init
   ```
5. Start the backend server:
   ```powershell
   npm run dev
   ```
   *The backend should now be running at `http://localhost:8080`.*

### 4. Frontend Setup
1. Open a **new** PowerShell/CMD window and navigate back to the root `event_` folder.
2. Navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
3. Create a `.env` file in the `frontend` folder:
   - In VS Code, create a new file named `.env` and paste:
     ```env
     VITE_API_BASE=http://localhost:8080
     VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_GOOGLE_MAPS_API_KEY
     ```
4. Install dependencies:
   ```powershell
   npm install --legacy-peer-deps
   ```
5. Start the frontend development server:
   ```powershell
   npm run dev
   ```
   *The frontend should now be running at `http://localhost:5173`.*

### 5. Common Troubleshooting (Windows)
- **Execution Policy Error**: If you get a "scripts are disabled" error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell as Admin.
- **Port 8080/5173 Busy**: Ensure no other services are using these ports. Use `netstat -ano | findstr :8080` to find and kill conflicting processes.
- **Prisma Issues**: If `npx prisma` fails, ensure you are in the `backend` folder and `npm install` finished successfully.

---

## 🚀 Production Deployment Guide

For a stable, scalable production environment, we recommend using platforms like **Railway**, **Render**, or **Vercel**.

### 1. Database Setup (PostgreSQL)
While SQLite is perfect for local demos, a production app should use **PostgreSQL**.
1. Create a PostgreSQL database on [Railway](https://railway.app/) or [Neon](https://neon.tech/).
2. In `backend/prisma/schema.prisma`, update the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Update your `DATABASE_URL` in the production environment variables.

### 2. Backend Deployment (Render/Railway)
1. **Root Directory**: `backend`
2. **Build Command**: `npm install && npx prisma generate && npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   - `PORT`: `8080` (or as provided by the platform)
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `JWT_SECRET`: A long, random string.
   - `AES_MASTER_KEY_B64`: A secure base64-encoded key.
   - `CLIENT_ORIGIN`: Your production frontend URL (e.g., `https://event-app.vercel.app`).

### 3. Frontend Deployment (Vercel/Netlify)
1. **Root Directory**: `frontend`
2. **Build Command**: `npm install && npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables**:
   - `VITE_API_BASE`: Your production backend URL (e.g., `https://event-backend.up.railway.app`).
   - `VITE_GOOGLE_MAPS_API_KEY`: Your production-restricted Google Maps API Key.

---

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, Vite, Google Maps API, CSS3.
- **Backend**: Node.js, Express, TypeScript, Prisma.
- **Database**: SQLite (Local), PostgreSQL (Production).
- **Security**: JWT Sessions, AES-256-GCM Encryption.
=======
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f163af9d-218f-4f31-9468-3814adc7d6ca

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on SnapDeploy (Docker)

This repo includes a production `Dockerfile` that:
- builds the Vite app to `dist/`
- serves it via a tiny Express server (`server.mjs`)
- listens on `PORT` (required by container platforms)

### SnapDeploy settings

- **Build type**: Dockerfile (repo root)
- **Start command**: uses the `Dockerfile` `CMD` (no extra command needed)
- **Environment variables**:
  - `GEMINI_API_KEY` (used at build time for the Vite bundle)

If SnapDeploy shows a **502**, verify the platform is setting `PORT` and that the container is healthy (it should bind `0.0.0.0:$PORT`).
>>>>>>> bfe29b1 (Initial commit)
