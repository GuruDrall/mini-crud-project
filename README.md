# Mini CRUD Login App

## Quick Start

Start the app server:

```bash
node server.js
```

Open MySQL from the command line:

```bash
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

Then open the app in the browser:

```text
http://localhost:8000/login
```

If you are already in the project folder, run the app server first, then open MySQL, then visit the URL above.

This project is a full-stack web application built with Node.js, Express, MySQL, and vanilla HTML/JavaScript. It includes:

- user login with session-based authentication
- protected pages and APIs
- a CRUD screen for managing users
- a styled frontend

---

## Project structure

```text
mini-crud/
├── db.js
├── package.json
├── server.js
├── README.md
├── START_HERE.txt
├── node_modules/
├── package-lock.json
└── public/
    ├── index.html
    ├── login.html
    └── style.css
```

---

## What each file does

### 1) package.json

This file stores the project name, dependencies, and scripts.

Important dependencies:

- express: creates the web server
- express-session: stores login session data
- cors: allows browser access
- mysql2: connects to MySQL
- uuid: generates unique user IDs
- nodemon: restarts the app during development

Run commands:

```bash
npm install
node server.js
```

or:

```bash
npx nodemon server.js
```

---

### 2) db.js

This file creates the MySQL connection pool.

```js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "crud_db",
  port: 3306,
});

module.exports = pool;
```

It connects the app to the local MySQL database using the configured credentials.

---

### 3) server.js

This is the main backend file. It configures the Express server, session handling, and API routes.

#### Session setup

```js
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000,
    },
  }),
);
```

This creates a login session that lasts for 1 hour.

#### Login route

```js
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const [rows] = await pool.query(
    "SELECT * FROM users_login WHERE username=? AND password=?",
    [username, password],
  );

  if (rows.length > 0) {
    req.session.user = username;

    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "INSERT INTO user_sessions (username, session_id, expires_at, is_active) VALUES (?, ?, ?, 1)",
      [username, req.sessionID, expires],
    );

    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});
```

This checks the `users_login` table and creates a session if the credentials match.

#### Authentication middleware

```js
async function isAuthenticated(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const [rows] = await pool.query(
    "SELECT * FROM user_sessions WHERE session_id=? AND is_active=1 AND expires_at > NOW()",
    [req.sessionID],
  );

  if (rows.length === 0) {
    req.session.destroy(() => {});
    return res.redirect("/login");
  }

  next();
}
```

This protects routes so only logged-in users can access the dashboard and API endpoints.

#### CRUD routes

```js
app.get("/users", isAuthenticated, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT new_id AS id, name, email FROM users",
  );
  res.json(rows);
});
```

```js
app.post("/users", isAuthenticated, async (req, res) => {
  const { name, email } = req.body;
  const id = uuidv4();

  await pool.query("INSERT INTO users (id, name, email) VALUES (?, ?, ?)", [
    id,
    name,
    email,
  ]);

  res.json({ id, name, email });
});
```

```js
app.put("/users/:id", isAuthenticated, async (req, res) => {
  const { name, email } = req.body;

  await pool.query("UPDATE users SET name=?, email=? WHERE new_id=?", [
    name,
    email,
    req.params.id,
  ]);

  res.json({ message: "Updated" });
});
```

```js
app.delete("/users/:id", isAuthenticated, async (req, res) => {
  await pool.query("DELETE FROM users WHERE new_id=?", [req.params.id]);
  res.json({ message: "Deleted" });
});
```

These routes let the app read, create, update, and delete users from the database.

#### Logout route

```js
app.get("/logout", async (req, res) => {
  await pool.query("UPDATE user_sessions SET is_active=0 WHERE session_id=?", [
    req.sessionID,
  ]);

  req.session.destroy(() => {
    res.redirect("/login");
  });
});
```

This invalidates the active session when the user logs out.

---

### 4) public/login.html

This is the login page shown before the user reaches the dashboard.

It contains:

- username input
- password input
- login button
- error message area

On button click, it sends POST data to `/login`.

---

### 5) public/index.html

This is the main page after login.

It contains:

- username label
- logout button
- form to add a user
- table to display users

It loads data from `/users` with JavaScript and refreshes the table after adding a user.

---

### 6) public/style.css

This file styles the entire app.

It includes:

- gradient page background
- modern card container
- form input styling
- button styling
- user table design
- login-specific layout
- header and logout buttons

---

## Database structure

This project expects a MySQL database named `crud_db`.

Create the tables like this:

```sql
CREATE DATABASE crud_db;

USE crud_db;

CREATE TABLE users (
  new_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);

CREATE TABLE users_login (
  username VARCHAR(255) PRIMARY KEY,
  password VARCHAR(255)
);

CREATE TABLE user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255),
  session_id VARCHAR(255),
  expires_at DATETIME,
  is_active TINYINT(1)
);
```

Add a sample login user:

```sql
INSERT INTO users_login (username, password)
VALUES ('admin', 'admin123');
```

---

## How the app works step by step

1. The browser opens `/login`.
2. The user enters username and password.
3. The frontend sends a POST request to `/login`.
4. The backend checks `users_login` in MySQL.
5. If valid, the session is created and saved in `user_sessions`.
6. The user is redirected to `/`.
7. The dashboard loads users from `/users`.
8. The user can add records using the form.
9. The backend inserts the record into the `users` table.
10. The user can click logout to end the session.

---

## How to run

### Step 1: Install dependencies

```bash
npm install
```

### Step 2: Start MySQL

Ensure MySQL is running locally.

### Step 3: Create the database and tables

Use MySQL to run the SQL commands above.

### Step 4: Start the server

```bash
node server.js
```

or:

```bash
npx nodemon server.js
```

### Step 5: Open the app

Go to:

```text
http://localhost:8000/login
```

Then log in with:

- username: `admin`
- password: `admin123`

---

## Common issues

- MySQL is not running
- wrong credentials in `db.js`
- database `crud_db` missing
- required tables missing
- port `8000` already in use

---

## Summary

This is a small login-protected CRUD project. The main flow is:

- login → session creation → dashboard → CRUD operations → logout

The core files are:

- [server.js](server.js): backend server and routes
- [db.js](db.js): database connection
- [public/login.html](public/login.html): login screen
- [public/index.html](public/index.html): dashboard UI
- [public/style.css](public/style.css): styling

#### Load users from API

```js
async function loadUsers() {
  const res = await fetch("http://localhost:8000/users");
  const users = await res.json();

  const table = document.getElementById("userTable");
  table.innerHTML = "";

  users.forEach((user) => {
    const row = `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
      </tr>
    `;
    table.innerHTML += row;
  });
}
```

This tells the browser to call the backend API and show the data in the HTML table.

#### Add new user

```js
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!name || !email) {
    alert("Both fields are required");
    return;
  }

  const res = await fetch("http://localhost:8000/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email }),
  });

  if (res.ok) {
    alert("User added successfully");
    form.reset();
    loadUsers();
  } else {
    alert("Error adding user");
  }
});
```

This sends the form values to the backend so a new record is created in the database.

---

## How the application works step by step

1. The browser loads `public/index.html`.
2. The page calls `GET /users` from the backend.
3. `server.js` queries the database through `db.js`.
4. MySQL returns the user records.
5. The frontend displays those records in a table.
6. When the user submits the form, the browser sends a `POST /users` request.
7. The backend inserts the new record into MySQL.
8. The frontend refreshes the table to show the new data.

---

## Database requirement

This project expects a MySQL database named `crud_db`.

The table should look something like this:

```sql
CREATE DATABASE crud_db;

USE crud_db;

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);
```

The backend uses `uuidv4()` to generate the `id` values automatically.

---

## How to run the project

### Step 1: Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### Step 2: Start MySQL

Make sure your MySQL server is running locally.

### Step 3: Create the database and table

Use MySQL Workbench, phpMyAdmin, or the MySQL command line and create:

```sql
CREATE DATABASE crud_db;
USE crud_db;
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);
```

### Step 4: Start the backend server

Run:

```bash
node server.js
```

or for auto-restart:

```bash
npx nodemon server.js
```

### Step 5: Open the app in browser

Go to:

```text
http://localhost:8000/
```

You should see the user form and table.

---

## Common issues

- MySQL is not running: the app will fail when trying to connect.
- Wrong database credentials: check username, password, and database name in `db.js`.
- `crud_db` does not exist: create the database first.
- Browser cannot fetch data: make sure the backend is running on port `8000`.

---

## Summary

This project is a simple CRUD app:

- `db.js` connects to the database
- `server.js` handles API logic
- `public/index.html` shows the form and table
- the app allows creating and viewing users through the browser

If you want to expand it later, you can add edit and delete buttons to the frontend and connect them to the existing API routes.
