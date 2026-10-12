# ResolveX — Viva Questions, Answers & Presentation Script

**Course:** 19MAM57 — Full Stack Web Development Lab  
**Department:** Department of Computing, Coimbatore Institute of Technology (CIT)  
**Programme:** M.Sc Artificial Intelligence and Machine Learning  

---

## Part 1: Comprehensive Viva Voce Questions & Answers (25 Questions)

### Q1: What real-world problem does ResolveX solve?
**Answer:** ResolveX solves the lack of transparency, accountability, and tracking in customer grievance workflows. Traditional email/phone customer support suffers from lost complaints, lack of audit trails, untracked SLAs, and poor visibility. ResolveX provides automated ticket numbering, role-based workflows for Customer, Support Staff, and Administrator, full status progression timelines, internal private investigation notes, and real-time resolution metrics.

### Q2: How does your frontend communicate with the backend?
**Answer:** The frontend communicates with the backend via asynchronous REST API calls using Axios. An Axios instance with base URL `/api/v1` is configured with request and response interceptors. The request interceptor retrieves the JWT token from `sessionStorage` and injects it into the HTTP header as `Authorization: Bearer <token>`. The response interceptor intercepts HTTP 401 errors and handles session expiration gracefully.

### Q3: Why is token authentication implemented with JWT instead of server sessions?
**Answer:** JSON Web Tokens (JWT) are stateless. The server does not need to store active session IDs in server memory, which makes the API horizontally scalable and decouples the React frontend from the Express backend. The token payload contains the user's MongoDB `_id` and `role`, signed cryptographically using `HMAC-SHA256` with a server secret key.

### Q4: How is password security maintained in ResolveX?
**Answer:** Passwords are never stored in plain text. We use `bcryptjs` with 10 salt rounds within a Mongoose pre-save middleware (`userSchema.pre('save')`). Salt generation protects against rainbow table attacks. In addition, the password field has `select: false` in the Mongoose schema, preventing accidental exposure in query responses.

### Q5: How do you prevent Privilege Escalation during registration?
**Answer:** In the public registration controller (`authController.register`), the server explicitly forces `role: 'customer'`, ignoring any `role` attribute sent in the HTTP request body. Staff and Administrator accounts can only be provisioned by authenticated Administrators through the protected `/api/v1/users` endpoint.

### Q6: How is Customer Data Isolation enforced on the backend?
**Answer:** In `complaintController.getAllComplaints`, if `req.user.role === 'customer'`, the query filter is forced to `{ customer: req.user._id }`. When querying a single complaint by ID (`getComplaintById`), the server checks `complaint.customer._id.toString() !== req.user._id.toString()`. If false, an HTTP 403 Forbidden is immediately returned. Hiding UI buttons in React is never trusted as the sole security boundary.

### Q7: How do you handle internal notes so customers cannot see them?
**Answer:** Notes in the `Complaint` model have an `isInternal: Boolean` attribute. In `getComplaintById`, if `req.user.role === 'customer'`, the server executes a filter on the returned object: `sanitizedComplaint.notes = complaint.notes.filter(n => !n.isInternal)`. Support staff can document confidential diagnostics without leaking details to customers.

### Q8: Explain the Mongoose Schema design for complaints and its relationships.
**Answer:** The `Complaint` schema uses document references (`ObjectId` with `ref: 'User'`) to link both the submitting `customer` and the assigned support `assignedTo`. Subdocuments are used for `statusHistory` (recording `status`, `changedBy`, `notes`, and `changedAt`) and `notes` (recording `author`, `note`, `isInternal`, and `createdAt`). This hybrid approach combines fast relational population with atomic audit logging.

### Q9: How are unique ticket numbers generated in ResolveX?
**Answer:** The `Complaint` pre-save hook automatically detects new documents (`this.isNew`) and formats the ticket number as `RX-YYYYMMDD-XXXX`, where `YYYYMMDD` is the current date and `XXXX` is a randomized 4-digit integer. A unique index `{ ticketNumber: 1, unique: true }` guarantees collision-free persistence in MongoDB.

### Q10: What is soft-deletion and why is it used instead of hard-deletion?
**Answer:** Soft-deletion sets a boolean flag (`isArchived: true`) rather than physically removing the document via `deleteOne()`. In enterprise systems, physically deleting business records destroys audit history and compliance logs. Active queries filter with `{ isArchived: false }`, preserving full historical data in MongoDB.

### Q11: What are React Hooks and which ones are utilized in ResolveX?
**Answer:** React Hooks allow functional components to manage state and side effects. In ResolveX:
- `useState`: Manages component state (form inputs, modal toggles, search keywords).
- `useEffect`: Manages asynchronous API fetching on mount and dependency changes.
- `useCallback`: Memoizes API fetchers to avoid unnecessary re-renders.
- `useContext`: Accesses global authentication state (`useAuth`) and toast alerts (`useToast`).
- `useParams` & `useNavigate`: React Router hooks for route parameter extraction and programmatic navigation.

### Q12: Why is the Context API used instead of Redux for this application?
**Answer:** Context API is built directly into React and provides clean global state without the boilerplate of Redux actions, reducers, and thunks. It is ideal for application-wide concerns such as user authentication sessions and toast notifications.

### Q13: How does ResolveX protect against brute-force password guessing?
**Answer:** We implemented `express-rate-limit` as middleware on `/api/v1/auth/login` and `/api/v1/auth/register`. It tracks requests by client IP address and throttles users to a maximum of 15 attempts per 15-minute window, returning HTTP 429 Too Many Requests if exceeded.

### Q14: How does MongoDB indexing improve performance in ResolveX?
**Answer:** We established compound indexes in Mongoose:
- `{ ticketNumber: 1, unique: true }`: Enables $O(1)$ ticket lookups.
- `{ customer: 1, createdAt: -1 }`: Optimizes customer dashboard queries.
- `{ assignedTo: 1, status: 1 }`: Speeds up staff queue filtering.
- `{ isArchived: 1, status: 1 }`: Eliminates table scans during operational queries.

### Q15: What is the purpose of the Vite proxy configuration?
**Answer:** In `client/vite.config.js`, the `/api` prefix is proxied to `http://localhost:5001` (configured on port 5001 to prevent collisions with the default macOS AirPlay / ControlCenter service on port 5000). This allows the React client on port 5173 to send requests to relative paths without encountering browser Cross-Origin Resource Sharing (CORS) preflight issues during local development.

### Q16: How is input validation handled across the stack?
**Answer:** Validation is enforced on both layers:
- **Frontend:** Controlled form inputs with live feedback on character bounds, email formatting regex, and password confirmation checks before dispatching requests.
- **Backend:** Middleware (`authValidator.js` and `complaintValidator.js`) validates all incoming payloads and sanitizes types. If validation fails, an HTTP 400 Bad Request with an array of specific error messages is returned before reaching the database.

### Q17: What HTTP status codes are used across ResolveX endpoints?
**Answer:**
- `200 OK`: Successful GET, PATCH, and DELETE operations.
- `201 Created`: Successful POST operations (registration, complaint filing, note creation).
- `400 Bad Request`: Input validation failures or malformed MongoDB ObjectIds.
- `401 Unauthorized`: Missing, invalid, or expired JWT token.
- `403 Forbidden`: Authenticated user lacks role permissions (e.g., Customer accessing Admin panel).
- `404 Not Found`: Target resource or route does not exist.
- `500 Internal Server Error`: Unhandled server exceptions caught by centralized error middleware.

### Q18: What is the difference between `protect` and `authorize` middleware?
**Answer:**
- `protect` handles **Authentication**: verifies *who* the user is by validating the JWT token and attaching `req.user`.
- `authorize` handles **Authorization**: verifies *what* the user is permitted to do by checking whether `req.user.role` is included in the allowed roles list (e.g. `authorize('admin')`).

### Q19: How are complaint status transitions audited?
**Answer:** Whenever status changes in `complaintController.updateStatus`, the server pushes an audit subdocument to `complaint.statusHistory` recording the new status, `changedBy: req.user._id`, an optional audit explanation note, and `changedAt: new Date()`. This guarantees an immutable chronological trail of who changed the ticket status and why.

### Q20: How does ResolveX calculate the resolution rate on the dashboard?
**Answer:** Using a MongoDB aggregation pipeline:
$$\text{Resolution Rate} = \left(\frac{\text{Count of RESOLVED} + \text{Count of CLOSED}}{\text{Total Active Complaints}}\right) \times 100$$
Calculated on the server in `complaintController.getComplaintStats` and rendered in the admin metrics card.

### Q21: Can a customer reopen a resolved complaint?
**Answer:** Yes. If a complaint is in `RESOLVED` or `CLOSED` status, the customer has a "Reopen Complaint" action. The backend validates that `complaint.customer === req.user._id`, transitions the status back to `OPEN`, clears the prior resolution descriptor, and appends a `Reopened by customer` entry to the status history.

### Q22: How is centralized error handling structured in Express?
**Answer:** An error handling middleware `(err, req, res, next)` is mounted at the bottom of `app.js`. When any controller catches an exception in an asynchronous try/catch block, it calls `next(error)`. The centralized middleware standardizes the response format to `{ status: 'error', message: err.message }` and includes stack traces in development mode.

### Q23: Why do we use semantic HTML5 elements?
**Answer:** We use `<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`, and `<footer>` rather than generic `<div>` tags. Semantic elements improve accessibility (screen readers can parse page landmarks), enhance SEO, and structure the DOM cleanly according to W3C standards.

### Q24: How does Vitest compare to Jest for testing this application?
**Answer:** Vitest shares Vite's transformation pipeline, esbuild engine, and configuration. It provides near-instant test startup and hot module reloading without requiring heavy Babel or Webpack transpilation layers.

### Q25: How does the application maintain state across page reloads?
**Answer:** On initialization, `AuthContext` checks `sessionStorage` for `resolvex_token`. If present, it issues a `GET /api/v1/auth/me` request to verify token validity against the database and hydrate user state. Non-sensitive preferences can be persisted without exposing passwords or sensitive tokens in `localStorage`.

---

## Part 2: 3-Minute CAT-II Practical Presentation Script

> **Opening (30 seconds):**  
> *"Good afternoon, professors. I am presenting **ResolveX**, an enterprise Customer Complaint Management System built from scratch to satisfy all eight criteria of the CAT-II rubric.*  
> *ResolveX solves a real-world problem: customer complaints in organizations often get delayed or lost due to untracked communication. Our application provides complete transparency with automated ticket numbering, role-based workflows for Customer, Support Staff, and Administrator, and an immutable status audit trail."*

> **Architecture & Tech Stack (45 seconds):**  
> *"The stack strictly adheres to our syllabus requirements:  
> - **Frontend:** React 18 SPA with Vite, React Router for protected role routing, and Context API for global session state.  
> - **Backend:** Node.js and Express RESTful API with modular MVC controllers, JWT authentication, and bcryptjs hashing.  
> - **Database:** Local MongoDB with Mongoose ODM implementing strict schemas, compound indexes, relational population, and soft deletion.  
> - **Testing:** Vitest and Supertest with 51 passing automated tests covering all 12 acceptance criteria."*

> **Live Workflow Demonstration (75 seconds):**  
> *"Let me demonstrate the complete lifecycle:  
> 1. **Customer Flow:** I log in as customer Aravind. I file a technical complaint regarding an optical fiber outage. Notice the automatic ticket ID `RX-20261011-1001` and initial status `OPEN`.  
> 2. **Admin Flow:** I switch to the Administrator portal. The dashboard displays real-time resolution metrics. In the complaints table, I assign this ticket to our technical specialist Priya.  
> 3. **Support Staff Flow:** Logging in as Priya, the ticket appears in her assigned queue. She transitions the status to `IN_PROGRESS` and adds an internal diagnostic note.  
> 4. **Customer Isolation & Audit Verification:** Returning to the customer view, Aravind sees the updated status and timeline, but our server-side sanitization guarantees that Priya's internal note remains confidential.  
> 5. Finally, Priya records the resolution details, marking it `RESOLVED`. If the problem reoccurs, Aravind can reopen the complaint with one click."*

> **Closing (30 seconds):**  
> *"ResolveX enforces security at every layer: brute-force rate limiting, bcrypt hashing, customer data isolation, and RBAC on the server. The entire system is production-built and verified with 100% test coverage. Thank you, professors. I am ready for questions."*

---

## Part 3: Screenshots Checklist for Submission Report

When compiling your CAT-II practical laboratory record, capture these screenshots:

1. **Terminal Evidence:**
   - [ ] Terminal running `npm test` showing 51 passing tests (49 backend + 2 frontend).
   - [ ] Terminal running `npm run build:client` showing clean Vite production build.
   - [ ] Terminal running `npm run seed` showing successful database population.
2. **Public Views:**
   - [ ] Landing Page (`http://localhost:5173/`) with hero header and stakeholder cards.
   - [ ] Login Page (`/login`) with demo credentials quick-filler buttons.
   - [ ] Customer Registration Page (`/register`) with form validation.
3. **Customer Views:**
   - [ ] Customer Dashboard (`/dashboard`) showing active ticket count and recent complaints.
   - [ ] Submit Complaint Form (`/complaints/new`) with category dropdown and priority selector.
   - [ ] Complaint Details Page (`/complaints/:id`) showing status progression timeline and communication thread.
4. **Support Staff Views:**
   - [ ] Staff Dashboard with assigned tickets list.
   - [ ] Status Transition Modal updating complaint to `IN_PROGRESS` or `RESOLVED`.
   - [ ] Internal Note creation with `[x] Internal Note` checkbox checked.
5. **Administrator Views:**
   - [ ] Executive Operations Dashboard with metric cards (Resolution Rate %, status and priority breakdown grids).
   - [ ] All Complaints Directory with search bar, category filter, and "Assign Staff" modal.
   - [ ] User & Staff Management Console (`/users`) with "Provision User / Staff" modal.
6. **MongoDB Database Evidence:**
   - [ ] MongoDB Compass or `mongosh` output querying `resolvex_db.complaints` and `resolvex_db.users`.
