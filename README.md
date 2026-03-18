# 🚌 ThinkBus — Auth Skeleton

A simple signup + login skeleton for the ThinkBus college project.
Stack: React (frontend) + FastAPI (backend) + Supabase (PostgreSQL database)

---

## 📁 Folder Structure

```
thinkbus/
│
├── database/
│   └── setup.sql              ← SQL to create the users table + sample data
│
├── backend/
│   ├── main.py                ← FastAPI app entry point
│   ├── database.py            ← Supabase client setup
│   ├── models.py              ← Request body shapes (Pydantic)
│   ├── routes/
│   │   └── auth.py            ← /signup and /login endpoints
│   ├── requirements.txt       ← Python dependencies
│   └── .env.example           ← Copy this to .env and add your keys
│
└── frontend/
    └── src/
        ├── main.jsx           ← React entry point
        ├── App.jsx            ← Page state manager (login/signup/welcome)
        ├── api.js             ← API calls to the backend
        ├── index.css          ← Minimal global styles
        └── pages/
            ├── LoginPage.jsx  ← Login form
            ├── SignupPage.jsx ← Signup form
            └── WelcomePage.jsx← Placeholder after login
```

---

## 🗄️ Step 1: Set Up the Database (Supabase)

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Create a new project.
3. In your project, go to **SQL Editor**.
4. Paste the contents of `database/setup.sql` and click **Run**.
5. This creates the `users` table and inserts 4 example users.

---

## ⚙️ Step 2: Run the Backend (FastAPI)

### Prerequisites
- Python 3.9+

### Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

### Fill in `.env`
Open `.env` and replace the placeholder values:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-public-key-here
```

You can find these in your Supabase project under:
**Project Settings → API → Project URL and anon public key**

### Start the server

```bash
uvicorn main:app --reload
```

The backend runs at: **http://localhost:8000**

You can test the API at: **http://localhost:8000/docs** (Swagger UI, auto-generated!)

---

## 💻 Step 3: Run the Frontend (React)

### Prerequisites
- Node.js 18+

### Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend runs at: **http://localhost:5173**

---

## 🧪 Test with Sample Users

These users are already inserted by `setup.sql`:

| Username       | Password    | Role    |
|----------------|-------------|---------|
| admin_user     | admin123    | Admin   |
| student_alex   | student123  | Student |
| parent_sara    | parent123   | Parent  |
| driver_raju    | driver123   | Driver  |

---

## 🔌 API Reference

### POST /signup
```json
Request:  { "username": "john", "password": "pass123", "role": "Student" }
Success:  { "success": true, "message": "Account created! Welcome, Student john." }
Failure:  { "success": false, "message": "Username already taken." }
```

### POST /login
```json
Request:  { "username": "john", "password": "pass123", "role": "Student" }
Success:  { "success": true, "message": "Login successful!", "role": "Student", "username": "john" }
Failure:  { "success": false, "message": "Invalid username, password, or role." }
```

---

## 📌 Notes

- Passwords are stored as **plain text** for simplicity. Add hashing (e.g., `bcrypt`) before deployment.
- No JWT tokens or sessions yet — these can be added in the next phase.
- The WelcomePage is a placeholder — replace it with role-specific dashboards later.
