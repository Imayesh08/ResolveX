# ResolveX — REST API Specification & Endpoint Documentation

**API Prefix:** `/api/v1`  
**Data Format:** `application/json`  
**Authentication Scheme:** Bearer Token via HTTP `Authorization: Bearer <jwt_token>` header.  

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Register Customer
- **Endpoint:** `POST /api/v1/auth/register`
- **Access:** Public (Rate-limited: 15 req/15min)
- **Description:** Registers a new Customer account. Enforces role `customer` on the server.
- **Request Body:**
  ```json
  {
    "name": "Aravind Swaminathan",
    "email": "aravind@example.com",
    "password": "Password123!",
    "phone": "9876543210"
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "status": "success",
      "message": "Account created successfully",
      "token": "eyJhbGciOi...",
      "data": {
        "user": {
          "id": "67090b...",
          "name": "Aravind Swaminathan",
          "email": "aravind@example.com",
          "role": "customer"
        }
      }
    }
    ```
  - `400 Bad Request`: Validation failure or email already registered.

---

### 1.2 User Login
- **Endpoint:** `POST /api/v1/auth/login`
- **Access:** Public (Rate-limited)
- **Description:** Authenticates user credentials via bcrypt verification and returns signed JWT.
- **Request Body:**
  ```json
  {
    "email": "admin@resolvex.local",
    "password": "Admin123!"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "status": "success",
      "message": "Logged in successfully",
      "token": "eyJhbGciOi...",
      "data": {
        "user": {
          "id": "67090b...",
          "name": "System Administrator",
          "email": "admin@resolvex.local",
          "role": "admin"
        }
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account is deactivated.

---

### 1.3 Get Current User Profile
- **Endpoint:** `GET /api/v1/auth/me`
- **Access:** Authenticated (`customer`, `staff`, `admin`)
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  - `200 OK`: Returns authenticated user document without password.

---

### 1.4 Update Password
- **Endpoint:** `PATCH /api/v1/auth/update-password`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Response:**
  - `200 OK`: Re-issues fresh JWT token.

---

## 2. User & Staff Management Endpoints (`/api/v1/users`)

### 2.1 Get Active Support Staff (Dropdown Triage)
- **Endpoint:** `GET /api/v1/users/staff`
- **Access:** `admin`, `staff`
- **Response:**
  - `200 OK`: Array of active staff members with names, emails, and departments.

---

### 2.2 List All Users (Admin Directory)
- **Endpoint:** `GET /api/v1/users`
- **Access:** `admin` only
- **Query Parameters:** `role`, `department`, `search`, `page`, `limit`
- **Response:**
  - `200 OK`:
    ```json
    {
      "status": "success",
      "results": 5,
      "pagination": { "total": 5, "page": 1, "pages": 1, "limit": 10 },
      "data": { "users": [ ... ] }
    }
    ```

---

### 2.3 Provision Staff or Admin User
- **Endpoint:** `POST /api/v1/users`
- **Access:** `admin` only
- **Request Body:**
  ```json
  {
    "name": "Karthik Support Lead",
    "email": "karthik.staff@resolvex.local",
    "password": "InitialStaffPass123!",
    "role": "staff",
    "department": "Technical Support",
    "phone": "9840112233"
  }
  ```
- **Response:**
  - `201 Created`: Account provisioned.

---

### 2.4 Deactivate User Account
- **Endpoint:** `DELETE /api/v1/users/:id`
- **Access:** `admin` only
- **Response:**
  - `200 OK`: Sets `isActive: false` (soft-deactivation).

---

## 3. Complaint Management Endpoints (`/api/v1/complaints`)

### 3.1 Submit Complaint
- **Endpoint:** `POST /api/v1/complaints`
- **Access:** `customer` (or admin)
- **Request Body:**
  ```json
  {
    "title": "Modem LOS flashing red after power outage",
    "description": "Modem restarted after storm; optic fiber power signal shows red light.",
    "category": "Technical Issue",
    "priority": "HIGH"
  }
  ```
- **Response:**
  - `201 Created`:
    ```json
    {
      "status": "success",
      "message": "Complaint submitted successfully.",
      "data": {
        "complaint": {
          "_id": "670912...",
          "ticketNumber": "RX-20261011-8492",
          "title": "Modem LOS flashing red after power outage",
          "category": "Technical Issue",
          "priority": "HIGH",
          "status": "OPEN",
          "customer": { "name": "Aravind Swaminathan", "email": "..." },
          "statusHistory": [
            {
              "status": "OPEN",
              "notes": "Complaint submitted by customer",
              "changedAt": "2026-10-11T10:00:00.000Z"
            }
          ]
        }
      }
    }
    ```

---

### 3.2 List Complaints with Role Scoping
- **Endpoint:** `GET /api/v1/complaints`
- **Access:** Authenticated (Server-scoped: Customers receive only their own tickets; staff and admin receive full catalog).
- **Query Parameters:** `status`, `priority`, `category`, `search`, `assignedTo`, `page`, `limit`
- **Response:**
  - `200 OK`: Array of populated complaints with pagination metadata.

---

### 3.3 Get Complaint Details & Audit Trail
- **Endpoint:** `GET /api/v1/complaints/:id`
- **Access:** Customer (owner only), Staff, Admin
- **Behavior:** If caller is a Customer, any internal staff notes (`isInternal: true`) are filtered out before sending response.
- **Response:**
  - `200 OK`: Complete complaint with populated customer, assigned staff, status history progression, and notes.
  - `403 Forbidden`: If caller is a customer attempting to access another customer's ticket.
  - `404 Not Found`: Non-existent ID.

---

### 3.4 Assign Complaint to Staff
- **Endpoint:** `PATCH /api/v1/complaints/:id/assign`
- **Access:** `admin` only
- **Request Body:**
  ```json
  {
    "staffId": "670914...",
    "notes": "Assigned to Priya for optical line diagnostics"
  }
  ```
- **Response:**
  - `200 OK`: Transitions status to `ASSIGNED` if currently `OPEN` and appends audit record.

---

### 3.5 Update Complaint Status & Record Resolution
- **Endpoint:** `PATCH /api/v1/complaints/:id/status`
- **Access:** Staff (assigned), Admin, Customer (reopen only)
- **Request Body (Status Transition):**
  ```json
  {
    "status": "IN_PROGRESS",
    "notes": "Technician en route to neighborhood junction box."
  }
  ```
- **Request Body (Resolution):**
  ```json
  {
    "status": "RESOLVED",
    "resolutionDescription": "Replaced damaged jumper cable and verified power level at -18dBm.",
    "notes": "Service validated with customer."
  }
  ```
- **Response:**
  - `200 OK`: Updated complaint with new status history entry and resolution details.

---

### 3.6 Post Communication or Investigation Note
- **Endpoint:** `POST /api/v1/complaints/:id/notes`
- **Access:** Authenticated
- **Request Body:**
  ```json
  {
    "note": "Line diagnostics reveal fluctuating SNR on port 4.",
    "isInternal": true
  }
  ```
- **Response:**
  - `201 Created`: Appends note to complaint document.

---

### 3.7 Archive Complaint (Soft Delete)
- **Endpoint:** `DELETE /api/v1/complaints/:id`
- **Access:** `admin` only
- **Response:**
  - `200 OK`: Sets `isArchived: true`.

---

### 3.8 Dashboard Analytics & Operational Statistics
- **Endpoint:** `GET /api/v1/complaints/stats/overview`
- **Access:** `admin`, `staff`
- **Response:**
  - `200 OK`:
    ```json
    {
      "status": "success",
      "data": {
        "totalComplaints": 14,
        "resolutionRate": "78%",
        "byStatus": { "OPEN": 3, "ASSIGNED": 2, "IN_PROGRESS": 2, "RESOLVED": 5, "CLOSED": 2 },
        "byPriority": { "LOW": 2, "MEDIUM": 5, "HIGH": 5, "URGENT": 2 },
        "byCategory": { "Technical Issue": 7, "Billing and Payment": 4, "Account Access": 3 },
        "recentComplaints": [ ... ]
      }
    }
    ```
