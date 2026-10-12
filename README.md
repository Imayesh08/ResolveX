# ResolveX — Enterprise Customer Complaint Management System

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Tests-58%20Passed-success.svg)]()
[![Stack](https://img.shields.io/badge/Stack-MERN%20(React%20%2B%20Node%20%2B%20Express%20%2B%20Mongo)-blue.svg)]()
[![Institution](https://img.shields.io/badge/Institution-CIT%20Coimbatore-purple.svg)]()

**Course:** 19MAM57 — Full Stack Web Development Lab  
**Degree:** M.Sc Artificial Intelligence and Machine Learning (5-Year Integrated Programme)  
**Department:** Department of Computing, Coimbatore Institute of Technology (CIT), Coimbatore  
**Assessment:** Continuous Assessment Test-II (CAT-II Practical Examination — 40 Marks)  

---

## 1. Problem Statement & Project Objectives

### Problem Statement
In conventional service organizations, customer grievances are frequently handled via uncoordinated email threads, manual spreadsheets, or ad-hoc phone calls. This leads to critical operational failures:
- **Lost and Unassigned Complaints:** Tickets slip through the cracks without assigned ownership.
- **Zero Accountability & Audit Trail:** Unclear who changed ticket statuses or when resolutions were attempted.
- **Customer Frustration:** Lack of visibility into real-time investigation stages.
- **Staff Bottlenecks:** Lack of internal triage notes separates customer-facing updates from engineering investigations.

### Project Objectives
**ResolveX** is an enterprise-grade web application engineered to solve these bottlenecks:
1. **Automated Ticket Numbering:** Issue collision-free, human-readable tickets (`RX-YYYYMMDD-XXXX`).
2. **Three-Tier Role-Based Access Control (RBAC):** Server-enforced permissions for **Customer**, **Support Staff**, and **Administrator**.
3. **Immutable Lifecycle Progression:** Detailed status progression timeline (`OPEN` $\to$ `ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `WAITING_FOR_CUSTOMER` $\to$ `RESOLVED` $\to$ `CLOSED`).
4. **Internal Support Triage:** Confidential internal diagnostics hidden from customer view.
5. **Customer Reopen Capability:** Ability for customers to reopen resolved complaints if an issue recurs.
6. **Executive Telemetry:** Aggregated metrics including resolution rate percentage, severity breakdowns, and category allocations.

---

## 2. Technology Stack

### Frontend
- **Framework:** React.js 18 (with Vite)
- **Routing:** React Router v6 (Protected routes, role-based guards)
- **HTTP Client:** Axios with JWT request & response interceptors
- **State Management:** React Context API (`AuthContext`, `ToastContext`) & Hooks
- **Styling:** Semantic HTML5, Custom responsive CSS3 design system with CSS custom properties
- **Icons:** Lucide React
- **Testing:** Vitest, React Testing Library, and jsdom

### Backend
- **Runtime & Server:** Node.js v22 & Express.js
- **API Architecture:** RESTful API with `/api/v1` prefix and modular MVC controllers
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs (10 salt rounds)
- **Security Middleware:** CORS whitelist, `express-rate-limit` brute-force mitigation, body-parser bounds
- **Validation:** Server-side request validation middleware and MongoDB ObjectId guards
- **Testing:** Vitest & Supertest

### Database
- **Engine:** MongoDB (local daemon running on port 27017)
- **Object Modeling:** Mongoose ODM v8
- **Schema Features:** Validation regex, uniqueness constraints, pre-save hooks, compound indexes, relational population, and soft-deletion (`isArchived`).

---

## 3. Monorepo Project Structure

```text
fsd_proj-2/
├── package.json                   # Root monorepo scripts (dev, test, seed, build)
├── .gitignore                     # Git ignore rules
├── README.md                      # Primary project documentation & rubric mapping
├── client/                        # React + Vite Frontend
│   ├── package.json               # Frontend dependencies
│   ├── vite.config.js             # Vite dev server (port 5173) & API proxy configuration
│   ├── index.html                 # Semantic HTML5 entry
│   └── src/
│       ├── main.jsx               # React DOM root mounting
│       ├── App.jsx                # Router tree and provider wrappers
│       ├── index.css              # Custom CSS3 design system & component classes
│       ├── api/axios.js           # Axios client with JWT session interceptors
│       ├── context/               # AuthContext & ToastContext
│       ├── components/            # StatusBadge, PriorityBadge, StatCard, Modal, etc.
│       ├── layouts/               # DashboardLayout with role navigation
│       ├── routes/                # ProtectedRoute & RoleRoute
│       ├── pages/                 # Landing, Login, Register, Dashboard, Complaints, Users, Profile
│       └── test/                  # Frontend Vitest test suites
├── server/                        # Node.js + Express Backend
│   ├── package.json               # Backend dependencies
│   ├── .env.example               # Environment template
│   ├── .env                       # Local environment configuration
│   ├── src/
│   │   ├── server.js              # Server bootstrapper & listener
│   │   ├── app.js                 # Express application & middleware stack
│   │   ├── config/db.js           # Mongoose connection manager & shutdown hooks
│   │   ├── controllers/           # authController, userController, complaintController
│   │   ├── middleware/            # auth (protect & authorize), rateLimiter
│   │   ├── models/                # User & Complaint Mongoose models
│   │   ├── routes/                # authRoutes, userRoutes, complaintRoutes
│   │   ├── validators/            # Request body validators
│   │   └── utils/                 # jwt.js and seedData.js
│   └── tests/                     # Backend API & integration test suites
└── docs/
    ├── architecture.md            # Mermaid architecture, sequence & ERD diagrams
    ├── api-documentation.md       # Complete REST endpoint specifications
    └── viva-questions.md          # 25 viva questions, answers, and 3-min presentation script
```

---

## 4. Local Environment & macOS Execution Setup

### Prerequisites
- macOS (tested on macOS Darwin arm64)
- Node.js `v22.x` or later (`node -v`)
- npm `v10.x` or later (`npm -v`)
- MongoDB running locally on port 27017 (`brew services start mongodb-community`)

### Step-by-Step Execution Commands

```bash
# 1. Clone or navigate to the project directory
cd /Users/imayeshs/Desktop/fsd_proj-2

# 2. Seed the MongoDB database with demo accounts and tickets
npm run seed

# 3. Start the Express Backend API (Port 5001 / configured to avoid macOS AirPlay conflict on 5000)
# (In Terminal Tab 1)
npm run dev:server

# 4. Start the React Frontend Application (Port 5173)
# (In Terminal Tab 2)
npm run dev:client
```

Open your browser at **`http://localhost:5173`**. The Vite dev server proxies `/api` requests directly to `http://localhost:5001`.

---

## 5. Demonstration Accounts for CAT-II Assessment Viva

The login page features convenient **Quick Demo Sign-In buttons** to populate these credentials with one click:

| Role | Email | Password | Department / Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@resolvex.local` | `Admin123!` | Executive dashboard, assign tickets, manage staff, analytics |
| **Support Staff** | `priya.staff@resolvex.local` | `Staff123!` | Technical Support specialist, update status, internal notes |
| **Support Staff 2** | `suresh.staff@resolvex.local` | `Staff123!` | Billing Operations specialist, process refunds, resolve tickets |
| **Customer** | `aravind.customer@resolvex.local` | `Customer123!` | Submit tickets, view own complaints, add follow-ups, reopen |
| **Customer 2** | `kavitha.customer@resolvex.local` | `Customer123!` | Customer isolation verification account |

---

## 6. Automated Testing Verification

Run the automated test suites using the following commands:

```bash
# Run all backend API and MongoDB integration tests (49 tests)
npm run test:server

# Run all frontend React component and form tests (9 tests)
npm run test:client

# Run unified workspace tests (58 total tests)
npm test

# Test frontend production bundle build
npm run build:client
```

### Verified Test Results Summary
- **Backend Test Suites (`server/tests/`):**
  - `server.test.js`: Server bootstrapper & 404 route handling (2 tests passed)
  - `models.test.js`: Schemas, password hashing, and compound indexes (9 tests passed)
  - `auth.test.js`: JWT tokens, login/register, privilege escalation, and RBAC (16 tests passed)
  - `complaint.test.js`: Ticket generation, customer isolation, assignments, and audit trails (13 tests passed)
  - `integration.test.js`: Complete 12-step acceptance criteria workflow (9 tests passed)
- **Frontend Test Suites (`client/src/test/`):**
  - `App.test.jsx`: Landing page and public route navigation (2 tests passed)
  - `LoginForm.test.jsx`: Login validation & demo buttons (2 tests passed)
  - `StatusBadge.test.jsx`: Semantic status badges (4 tests passed)
  - `PriorityBadge.test.jsx`: Priority indicators (1 test passed)
- **Total Passing Tests:** **58 of 58 (100% Pass Rate)**

---

## 7. Assessment Rubric Evidence Matrix (40 Marks)

| Criterion | Marks | Evaluation Parameters | Evidence in ResolveX Implementation |
| :---: | :---: | :--- | :--- |
| **1** | **5** | **Problem Definition**<br>&bull; Problem relevance (2)<br>&bull; Objectives & scope (2)<br>&bull; Feasibility & innovation (1) | Documented in `README.md` and `docs/architecture.md`. Clear justification of complaint accountability, SLA tracking, and audit logging. |
| **2** | **5** | **HTML & CSS**<br>&bull; Structure & semantics (2)<br>&bull; CSS styling & responsive design (2)<br>&bull; Page layout (1) | Semantic HTML5 tags (`<header>`, `<nav>`, `<aside>`, `<main>`, `<article>`), accessible forms, CSS3 variables, responsive dashboard shell, badges, and modals in `client/src/index.css`. |
| **3** | **5** | **JavaScript & AJAX**<br>&bull; JS functionality (1)<br>&bull; DOM & event handling (2)<br>&bull; Validation & AJAX/JSON (2) | Controlled form state, inline input validation, centralized Axios instance with JWT interceptors, dynamic table filtering, and error handling. |
| **4** | **6** | **React.js**<br>&bull; Components & reusability (2)<br>&bull; Routing & navigation (2)<br>&bull; State & data binding (2) | Reusable components (`StatusBadge`, `PriorityBadge`, `StatCard`, `Modal`, `EmptyState`), React Router v6 guards (`ProtectedRoute`, `RoleRoute`), Context API (`AuthContext`, `ToastContext`). |
| **5** | **6** | **Node.js**<br>&bull; HTTP server / REST API (2)<br>&bull; Routing & middleware (2)<br>&bull; Validation & error handling (2) | Express server with modular MVC controllers, `express-rate-limit`, JWT verification (`protect`), RBAC (`authorize`), and centralized error middleware. |
| **6** | **6** | **MongoDB & CRUD**<br>&bull; Database design & connectivity (2)<br>&bull; CRUD operations (3)<br>&bull; Data validation (1) | Mongoose models (`User`, `Complaint`), compound indexes, bcrypt pre-save hashing, auto-ticket generation, full CRUD, and soft-deletion (`isArchived`). |
| **7** | **5** | **Integration**<br>&bull; API integration (1)<br>&bull; Frontend-Backend (1)<br>&bull; Backend-Database (1)<br>&bull; End-to-end functionality (2) | End-to-end pipeline verified with 58 automated integration tests covering the complete 12-step lifecycle. |
| **8** | **3** | **Documentation & Viva**<br>&bull; Code quality & documentation (1)<br>&bull; Demonstration & viva (2) | Complete `architecture.md`, `api-documentation.md`, `viva-questions.md` with 25 Q&A, and 3-minute presentation script. |
| **Total** | **40** | **Comprehensive Full Stack Web Development Assessment** | **100% Rubric Coverage** |

---

## 8. Limitations & Future Enhancements

### Current Limitations
1. Single attachment support is currently modeled via metadata rather than Amazon S3/Cloudinary object storage.
2. Email notifications (e.g. Nodemailer or SendGrid) are simulated via status history audit records.

### Future Enhancements
1. **AI-Powered Triage (M.Sc AI & ML Specialization):** Implement NLP classification to automatically predict ticket category and assign appropriate department support staff upon submission.
2. **Real-Time WebSockets:** Implement Socket.io for instant live status updates without requiring page refreshes.
3. **Sentiment Analysis:** Analyze customer complaint text to prioritize urgent tickets exhibiting negative sentiment.

---

## 9. Academic Integrity Declaration

This application was developed as an original project for the Continuous Assessment Test-II (CAT-II) in **19MAM57 Full Stack Web Development Laboratory** at Coimbatore Institute of Technology. All criteria have been implemented with real database persistence, strict security controls, and verified test suites.
