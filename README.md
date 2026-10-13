# 🩸 Blood in Time – AI-Based Blood Inventory & Redistribution System

> **A smart healthcare logistics and inventory management prototype designed to monitor blood bank stock, detect impending shortages, recommend automated inter-bank redistribution, and streamline hospital emergency requests.**

---

## 📌 1. Project Overview & Problem Statement

### The Problem
In critical healthcare emergencies, timely access to compatible blood saves lives. However, most blood banks and hospitals operate in disconnected silos:
* **Localized Shortages**: A regional hospital or blood bank may face an acute deficit of critical blood groups (e.g., `O-` or `AB-`) during emergencies.
* **Wastage & Expiration**: Nearby blood banks may have excess stock of those same blood groups that risk expiration if not redistributed in time.
* **Manual & Slow Coordination**: Communication between blood banks currently relies on manual phone calls and uncoordinated logistics, causing vital delays.

### The Solution
**Blood in Time** bridges this gap by creating an integrated, intelligent blood management network:
1. **Real-time Monitoring**: Continuously tracks stock across all 8 blood groups against AI-recommended minimum safety thresholds.
2. **Automated Shortage Detection**: Instantly flags shortages when stock drops below safety buffers.
3. **Smart Redistribution**: Identifies surplus partner blood banks and generates ready-to-execute transfer recommendations to rebalance supply.
4. **Hospital Emergency Portal**: Enables hospitals to submit emergency requests, checks network availability, and confirms stock issuance with immediate balance reconciliation.
5. **Auditing & History Logs**: Maintains a demonstration audit trail of all blood requests and inter-bank transfers.

---

## 🚀 2. Key Features

### 🏥 Hospital Portal
* **Request Submission**: Submit blood requests with blood group, required units, urgency level (*Emergency*, *Urgent*, *Normal*), and hospital name.
* **Instant Availability Check**: Real-time cross-referencing against primary and nearby blood banks to locate available units.
* **Non-Deductive Submission**: Submitting a request logs it as `Pending` without prematurely reducing stock.
* **Confirmed Issue Action**: Blood units are deducted from inventory only after clinical confirmation.
* **Persistent Request Log**: All past requests remain visible with their tracking IDs and statuses even after refreshing the page, with one-click issue confirmation for pending items.

### 🩸 Blood Bank Portal
* **Live Inventory Dashboard**: Full visibility of stock levels and AI minimum thresholds for all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`).
* **Editable Stock with Validation**: Direct in-place stock adjustments that validate inputs (rejecting negative numbers or invalid values) and update storage.
* **Automated Shortage Alerts**: Highlights blood groups operating below minimum required thresholds and calculates the exact shortfall.
* **Redistribution Recommendations**: Automatically scans partner banks (e.g., Blood Bank B, C, D, E) for surplus stock and recommends transfer quantities.
* **Safe Transfer Confirmation**: Prompts confirmation before dispatching transfers and balances both the source and receiving banks simultaneously.
* **Transfer History Log**: Logs all completed transfers with timestamps, source, destination, blood group, and unit count.

---

## 💻 3. Technology Stack

| Layer | Technologies Used | Description |
|---|---|---|
| **Frontend** | React 19, JavaScript (ES6+), CSS3 | Component-driven UI with modern hooks (`useState`, `useEffect`), responsive card layouts, and status badges. |
| **Build Tool** | Vite 8 | Ultra-fast development server and optimized production bundler. |
| **Backend** | Node.js, Express 5 | RESTful API server handling validation, inventory business logic, and transaction management. |
| **Middleware** | CORS, Express JSON Parser | Cross-Origin Resource Sharing enabled for client-server communication. |
| **Storage Layer** | Persistent JSON File Store (`backend/data/store.json`) | Lightweight, self-contained persistence layer requiring no external database server setup during grading or evaluation. |
| **Code Quality** | Oxlint, Custom Node Test Suite | Zero lint warnings/errors; automated suite of 36 unit/integration assertions. |

---

## 📁 4. Project Folder Structure

```text
Blood-in-time/
├── backend/
│   ├── data/
│   │   └── store.json          # Persistent JSON database (banks, inventory, requests, transfers)
│   ├── node_modules/           # Backend dependencies
│   ├── package.json            # Backend configuration & npm scripts (start, test)
│   ├── package-lock.json       # Exact dependency lockfile
│   ├── server.js               # Express application with all 9 RESTful endpoints
│   ├── storage.js              # Data access layer and business logic abstraction
│   └── test-api.js             # Automated test suite (36 assertions)
├── public/
│   ├── favicon.svg             # Application icon
│   └── icons.svg               # SVG icons
├── src/
│   ├── assets/                 # Static images and visual assets
│   ├── App.css                 # Comprehensive custom styling (dashboards, tables, alerts, badges)
│   ├── App.jsx                 # Main React component containing navigation & dashboards
│   ├── index.css               # Global base styles
│   └── main.jsx                # React application entry point
├── .gitignore                  # Git ignore rules (node_modules, logs, build artifacts)
├── .oxlintrc.json              # Oxlint linter configuration
├── index.html                  # HTML entry page
├── package.json                # Frontend configuration & npm scripts (dev, build, lint)
├── package-lock.json           # Frontend dependency lockfile
├── vite.config.js              # Vite configuration
└── README.md                   # Complete project documentation
```

---

## 🧠 5. How the Architecture Works (Beginner-Friendly Explanation)

### The Frontend (React + Vite)
* The user interface runs in the browser. It is built using React components and holds local state (such as the current page, form inputs, and inventory data).
* When a user performs an action (e.g., updates stock or submits a request), the frontend sends an asynchronous HTTP request using the native `fetch()` API to the Express server running on port `5000`.
* The UI updates optimistically for responsive typing, and synchronizes with server responses.

### The Backend (Express.js API)
* The backend server listens on `http://localhost:5000`.
* It routes incoming requests to specific endpoints (e.g., `GET /api/inventory` or `POST /api/requests`).
* It validates all incoming parameters (ensuring units are positive integers, blood groups are valid, and transfers do not exceed available stock).
* It communicates directly with the storage layer to retrieve or update records.

### The Data Storage Layer (`store.json` + `storage.js`)
* Instead of requiring complex database software (such as MongoDB Compass or cloud Atlas accounts) to be installed on an evaluator's machine, the application uses an **organized file-based JSON store** located at `backend/data/store.json`.
* All read and write operations are encapsulated inside `backend/storage.js`.
* Whenever an update occurs, the file is written to disk atomically.
* **Persistence Guarantee**: If the browser is refreshed or the server is restarted, all data—including updated stock levels, past requests, and transfer history—remains intact.
* **MongoDB-Ready**: Because all database operations are isolated inside `storage.js`, switching to MongoDB/Mongoose in the future requires modifying only this single file without changing any Express route logic.

---

## 📡 6. API Reference

All backend endpoints are prefixed with `/api` and return standardized JSON:

| Endpoint | Method | Purpose | Input / Payload | Response |
|---|---|---|---|---|
| `/api/health` | `GET` | Health check & connectivity | None | `{ status: "success", message: "..." }` |
| `/api/inventory` | `GET` | Retrieve primary blood bank inventory | None | Array of 8 blood group items with `group`, `stock`, `minimum` |
| `/api/inventory/:group` | `PUT` | Update stock for a specific blood group | `{ "stock": number }` | `{ message: "...", inventory: {...} }` |
| `/api/banks` | `GET` | Retrieve all blood banks and inventories | None | Array of banks (Bank A through E) with stock details |
| `/api/requests` | `POST` | Create a new hospital blood request | `{ "bloodGroup": "O+", "units": 2, "urgency": "Emergency", "hospitalName": "..." }` | `{ message: "...", request: { id: "req_...", status: "Pending", ... } }` |
| `/api/requests` | `GET` | Retrieve all past hospital requests | None | Array of requests sorted newest first |
| `/api/requests/:id/issue` | `POST` | Confirm blood issue and deduct stock | `{ "bankId": "bank-a", "bankName": "..." }` | `{ message: "...", request: { status: "Issued", ... }, bank: {...} }` |
| `/api/redistribution/transfer` | `POST` | Execute transfer between two banks | `{ "sourceBank": "Blood Bank B", "destinationBank": "Blood Bank A", "group": "O+", "units": 3 }` | `{ message: "...", transfer: {...}, sourceBank: {...}, destinationBank: {...} }` |
| `/api/redistribution/history` | `GET` | Retrieve confirmed transfer history | None | Array of transfer transaction records |

---

## 🛠️ 7. Installation and Execution Guide

### Prerequisites
* **Node.js** (v18.0.0 or higher recommended)
* **npm** (installed with Node.js)

### Step 1: Clone or Open the Repository
Open a terminal in the project root directory:
```powershell
cd c:\Users\kvars\OneDrive\Pictures\Desktop\dt\Blood-in-time
```

### Step 2: Install Dependencies
1. **Frontend dependencies**:
   ```powershell
   npm install
   ```
2. **Backend dependencies**:
   ```powershell
   cd backend
   npm install
   cd ..
   ```

---

### Step 3: Run the Application

Open **two terminal windows**:

#### Terminal 1 — Start Backend Server
```powershell
cd backend
npm start
```
*Output:*
```text
Server running on http://localhost:5000
```

#### Terminal 2 — Start Frontend Application
```powershell
npm run dev
```
*Output:*
```text
  VITE v8.3.1  ready in ... ms

  ➜  Local:   http://localhost:5173/
```

Open **`http://localhost:5173`** in your browser.

---

### Step 4: Run Automated Tests & Checks

1. **Backend API Automated Tests (36 Assertions)**:
   ```powershell
   cd backend
   npm test
   ```
2. **Frontend Linter Check (Oxlint)**:
   ```powershell
   npm run lint
   ```
3. **Frontend Production Build**:
   ```powershell
   npm run build
   ```

---

## 🎬 8. Live Demonstration Walkthrough (For Viva / Evaluation)

Follow these steps during your presentation to demonstrate the complete workflow:

### Feature 1: Connectivity Verification
1. Open the landing page at `http://localhost:5173`.
2. In the hero section, click **"Test Backend"**.
3. An alert will confirm: `Backend connected successfully! Status: success`.

### Feature 2: Hospital Blood Request & Stock Reservation
1. Click **"Hospital Login"** (or choose Hospital on the Login page).
2. Fill out the request form:
   * **Hospital Name**: `City General Hospital`
   * **Blood Group**: `A+`
   * **Required Units**: `2`
   * **Urgency**: `Emergency`
3. Click **"Submit Blood Request"**.
4. Observe the green card displaying:
   * Tracking ID: `req_...`
   * Recommended Source: `Blood Bank A`
   * Status: **Available** (Available Stock: 20 units)
5. Notice that the request appears in the **Recent Hospital Blood Requests** table with status **Pending**.
6. At this stage, stock has **not** been deducted prematurely.

### Feature 3: Confirm Blood Issue & Real-Time Deduction
1. Click **"Confirm Blood Issue"** on the recommendation card (or on the row in the table).
2. The request status updates to **Issued**.
3. Navigate back to Home and open the **Blood Bank Dashboard**.
4. Check the `A+` stock row: the stock has automatically decreased from `20` to `18` units.

### Feature 4: Shortage Detection & AI Minimums
1. On the Blood Bank Dashboard, locate `A-` (Current Stock: `5`, AI Minimum: `8`).
2. Notice the row is flagged with a red **⚠️ Shortage** badge and highlighted in the **Shortage Detected** alert card.
3. Edit the stock of `B+` from `18` to `5` directly in the input box.
4. The system immediately re-evaluates and adds `B+` to the shortage alerts list.

### Feature 5: Inter-Bank Redistribution Transfer
1. Scroll down to the **Redistribution Recommendation** section.
2. For the `A-` shortage (shortfall: 3 units), the system scans partner blood banks and displays:
   * `Blood Bank C has sufficient A- stock (Available Stock: 15 units).`
   * `Recommended Transfer: 3 units.`
3. Click **"Confirm Transfer"**.
4. Confirm the prompt dialog.
5. A confirmation banner appears, `A-` stock in Blood Bank A increases to `8`, removing the shortage!
6. Scroll to the **Redistribution Transfer History** table to see the logged transfer with its unique `xfer_...` ID.

### Feature 6: Page Refresh & Persistence Verification
1. Press `F5` or refresh the browser.
2. Both dashboards reload their updated stock numbers and history logs directly from `store.json`. No data is lost!

---

## ⚖️ 9. Academic & Clinical Disclaimer

> **Note**: This application is a software prototype developed for academic demonstration and evaluation purposes. In clinical environments, blood redistribution and issuance require authorized blood banking protocols, cross-matching, cold-chain logistics monitoring, and regulatory compliance under national healthcare authorities.
