# ResolveX Architecture & Technical Design Document

**Course:** 19MAM57 — Full Stack Web Development Lab  
**Programme:** M.Sc Artificial Intelligence & Machine Learning (5-Year Integrated)  
**Institution:** Coimbatore Institute of Technology (CIT), Coimbatore  
**Assessment:** Continuous Assessment Test-II (CAT-II Practical)  

---

## 1. System Architecture Overview

ResolveX is designed as a modular 3-tier enterprise application separating Presentation (React.js SPA with Vite), Application Server (Node.js & Express RESTful API), and Persistent Database (MongoDB with Mongoose ODM).

```mermaid
graph TD
    subgraph Client Tier ["Client Tier (Browser - Port 5173)"]
        UI["React.js 18 + Vite SPA"]
        RC["React Router v6 Navigation"]
        CTX["Context API (AuthContext, ToastContext)"]
        AX["Axios HTTP Client + Interceptors"]
    end

    subgraph Server Tier ["Server Tier (Node.js / Express - Port 5001)"]
        EXP["Express HTTP Server"]
        RL["express-rate-limit Middleware"]
        CORS["CORS Policy Middleware"]
        VAL["Input Validators (Auth & Complaint)"]
        AUTH["Auth & RBAC Middleware (protect & authorize)"]
        
        subgraph Controllers ["MVC Controllers"]
            AC["authController"]
            UC["userController"]
            CC["complaintController"]
        end
    end

    subgraph Data Tier ["Data Tier (MongoDB - Port 27017)"]
        MNG["Mongoose ODM (Schemas & Hooks)"]
        DB[("MongoDB: resolvex_db")]
        U_COLL[("users Collection")]
        C_COLL[("complaints Collection")]
    end

    UI --> RC --> CTX --> AX
    AX -- "HTTP / REST (JSON + JWT Bearer)" --> EXP
    EXP --> CORS --> RL --> VAL --> AUTH
    AUTH --> AC & UC & CC
    AC & UC & CC --> MNG
    MNG --> DB
    DB --> U_COLL
    DB --> C_COLL
```

---

## 2. End-to-End Data Flow Pipeline

The system enforces strict request/response data flow across all CRUD operations:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Browser)
    participant UI as React Component
    participant Axios as Axios Client
    participant Express as Express Router & Middleware
    participant Controller as Complaint Controller
    participant Mongoose as Mongoose ODM
    participant MongoDB as MongoDB Database

    Customer->>UI: Submit Complaint Form
    UI->>UI: Validate Client-Side Inputs
    UI->>Axios: POST /api/v1/complaints { title, description, category, priority }
    Note over Axios: Attach Authorization: Bearer <token>
    Axios->>Express: Send HTTP Request
    Express->>Express: Rate Limit & Body Validation
    Express->>Express: Verify JWT & Attach req.user
    Express->>Controller: Invoke createComplaint(req, res)
    Controller->>Mongoose: Complaint.create({ ..., customer: req.user._id })
    Mongoose->>Mongoose: Execute pre('save') (Generate RX-YYYYMMDD-XXXX ticket & seed statusHistory)
    Mongoose->>MongoDB: Insert Document into complaints collection
    MongoDB-->>Mongoose: Document Saved
    Mongoose-->>Controller: Return Populated Document
    Controller-->>Axios: HTTP 201 Created { status: 'success', data: { complaint } }
    Axios-->>UI: Resolve Promise with JSON payload
    UI->>Customer: Display Success Toast & Navigate to Ticket Details Timeline
```

---

## 3. Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ COMPLAINT : "files as customer"
    USER ||--o{ COMPLAINT : "assigned as staff"
    USER ||--o{ STATUS_HISTORY : "transitions status"
    USER ||--o{ NOTE : "authors note"
    COMPLAINT ||--|{ STATUS_HISTORY : "contains audit trail"
    COMPLAINT ||--o{ NOTE : "contains remarks"

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password "Hashed with bcrypt"
        string role "customer | staff | admin"
        string department "Technical Support | Billing | Ops"
        string phone
        boolean isActive
        Date createdAt
        Date updatedAt
    }

    COMPLAINT {
        ObjectId _id PK
        string ticketNumber UK "Indexed (RX-YYYYMMDD-XXXX)"
        string title
        string description
        string category "Technical | Billing | Product | Access"
        string priority "LOW | MEDIUM | HIGH | URGENT"
        string status "OPEN | ASSIGNED | IN_PROGRESS | RESOLVED | CLOSED"
        ObjectId customer FK "References USER"
        ObjectId assignedTo FK "References USER (optional)"
        object resolution "{ description, resolvedAt, resolvedBy }"
        boolean isArchived "Indexed for soft-deletion"
        Date createdAt
        Date updatedAt
    }

    STATUS_HISTORY {
        ObjectId _id PK
        string status
        ObjectId changedBy FK "References USER"
        string notes
        Date changedAt
    }

    NOTE {
        ObjectId _id PK
        ObjectId author FK "References USER"
        string note
        boolean isInternal "true = staff-only, false = customer visible"
        Date createdAt
    }
```

---

## 4. Security Architecture & Threat Mitigations

| Threat Vector | Mitigation Strategy Implemented in ResolveX |
| :--- | :--- |
| **Credential Stuffing & Brute Force** | `express-rate-limit` throttles IP requests to 15 authentication attempts per 15-minute window on `/api/v1/auth/login` and `/api/v1/auth/register`. |
| **Password Storage Breach** | Passwords are cryptographically hashed using `bcryptjs` with 10 salt rounds in a Mongoose pre-save middleware. Raw passwords are never stored or logged. Schema uses `select: false` to prevent accidental inclusion in query results. |
| **Privilege Escalation** | Public customer registration forces `role: 'customer'`. Admin and Staff accounts can only be provisioned by authenticated Administrators through `/api/v1/users`. |
| **Insecure Direct Object References (IDOR)** | When querying complaint details, the backend verifies ownership: if `req.user.role === 'customer'` and `complaint.customer !== req.user._id`, the server issues a `403 Forbidden` response. |
| **Information Leakage via Notes** | Internal staff notes marked with `isInternal: true` are filtered out before sending JSON responses to Customer clients. |
| **Cross-Origin Resource Sharing (CORS)** | Strict CORS policies allow requests only from verified origins (`http://localhost:5173`) with explicitly whitelisted HTTP verbs. |
| **DoS via Payload Flooding** | `express.json({ limit: '1mb' })` enforces strict payload bounds. |
| **Data Loss Prevention** | Soft deletion (`isArchived: true`) retains complaint history for auditing while removing tickets from active operational views. |
