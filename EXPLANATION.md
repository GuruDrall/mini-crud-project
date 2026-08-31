# Explanatory Documentation

This document explains how the app works in detail, including the role of each file, the request flow, and why the backend is structured the way it is.

---

## 1. Overview

This project is a full-stack Node.js app with:

- an Express backend
- MySQL database storage
- session-based login
- static frontend pages in the `public` folder
- browser-side JavaScript to fetch data and update the view

The app allows users to:

- log in
- access protected pages
- read user records
- insert new user records
- logout securely

Even though it is not a chat app, the structure is similar to a real-time front-end because the page updates after requests without full page reloads.

---

## 2. Why the main packages are used

### Express

Express is used to create the HTTP server and define routes.

```js
const express = require("express");
const app = express();
```

This line creates the app object that listens for requests like:

- `/login`
- `/users`
- `/logout`
- `/`

It is the central server framework for the app.

### express-session

HTTP is stateless, so the server needs a way to remember the logged-in user.

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

This stores session data on the server. The session contains the logged-in username and a session ID. It lets the app check whether a user is already signed in.

### CORS

```js
app.use(cors());
```

CORS allows browser requests from different origins to access the API. Even though this app serves the frontend from the same server, CORS is still important for compatibility and safe cross-origin API access.

---

## 3. File-by-file explanation

### db.js

This file sets up the MySQL connection pool.

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

What each part does:

- `mysql2/promise` enables async database queries
- `createPool()` reuses database connections instead of opening a new one each time
- `host`, `user`, `password`, and `database` tell the app how to connect to MySQL
- `module.exports = pool` lets the rest of the app use the DB connection

This is the database access layer for the whole application.

---

### server.js

This is the main backend file. It is responsible for:

- creating the Express server
- serving static frontend files
- handling login and session checks
- protecting pages and APIs
- calling MySQL for CRUD operations

Important setup lines:

```js
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 8000;
```

Line by line:

- `express` creates the app
- `session` manages login state
- `cors` allows browser access
- `path` helps serve files from the public directory
- `pool` connects to MySQL
- `uuidv4()` creates unique IDs for records
- `PORT = 8000` tells the app which port to run on

Then JSON parsing is enabled:

```js
app.use(cors());
app.use(express.json());
```

- `cors()` adds CORS support
- `express.json()` lets the server read JSON from incoming requests

Static files are served with:

```js
app.use(express.static(path.join(__dirname, "public")));
```

This makes files like `login.html` and `index.html` accessible in the browser.

---

## 4. Login flow

The login route looks like this:

```js
app.post("/login", async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});
```

What happens step by step:

1. The browser sends username and password in JSON.
2. The server reads them from `req.body`.
3. It queries MySQL for the username/password pair.
4. If found, it sets `req.session.user = username`.
5. It also stores the session info in `user_sessions`.
6. It responds with `{ success: true }`.

This is how the login is recognized across all future requests.

---

## 5. Authentication middleware

```js
async function isAuthenticated(req, res, next) {
  try {
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
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
}
```

This middleware protects the app’s private routes.

It checks:

- whether the user has a valid session
- whether the DB says the session is still active
- whether the session expiration time has passed

If not valid, the app redirects to `/login`.

This is the main security layer of the app.

---

## 6. CRUD API routes

### Get all users

```js
app.get("/users", isAuthenticated, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT new_id AS id, name, email FROM users",
  );
  res.json(rows);
});
```

This route:

- checks authentication
- reads all user rows from the database
- sends them to the browser as JSON

### Add a new user

```js
app.post("/users", isAuthenticated, async (req, res) => {
  try {
    const { name, email } = req.body;
    const id = uuidv4();

    await pool.query("INSERT INTO users (id, name, email) VALUES (?, ?, ?)", [
      id,
      name,
      email,
    ]);

    res.json({ id, name, email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

This route:

- reads form data from the browser
- creates a unique ID
- inserts the record into the `users` table
- returns the inserted data as JSON

### Update a user

```js
app.put("/users/:id", isAuthenticated, async (req, res) => {
  try {
    const { name, email } = req.body;

    await pool.query("UPDATE users SET name=?, email=? WHERE new_id=?", [
      name,
      email,
      req.params.id,
    ]);

    res.json({ message: "Updated" });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});
```

This updates a row based on the route parameter `:id`.

### Delete a user

```js
app.delete("/users/:id", isAuthenticated, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE new_id=?", [req.params.id]);

    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});
```

This removes a row from the database.

---

## 7. Logout flow

```js
app.get("/logout", async (req, res) => {
  try {
    await pool.query(
      "UPDATE user_sessions SET is_active=0 WHERE session_id=?",
      [req.sessionID],
    );

    req.session.destroy(() => {
      res.redirect("/login");
    });
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});
```

This does two things:

- sets the current DB session as inactive
- destroys the server-side session

After logout, the user is redirected back to the login page.

---

## 8. public/login.html

This is the login screen.

```html
<div class="container login-container">
  <h1>Login</h1>

  <input type="text" id="username" placeholder="Username" />
  <input type="password" id="password" placeholder="Password" />

  <button onclick="login()">Login</button>

  <p id="error" style="color: red"></p>
</div>
```

This page contains:

- a username field
- a password field
- a login button
- a place to show errors

The login JavaScript is:

```js
async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (res.ok) {
    window.location.href = "/";
  } else {
    document.getElementById("error").innerText = "Invalid credentials";
  }
}
```

This is the browser’s request to the backend.

---

## 9. public/index.html

This is the main dashboard shown after login.

It contains:

- a username display
- a logout button
- input fields for name and email
- an Add User button
- a user table

The user list is loaded with:

```js
async function loadUsers() {
  const res = await fetch("/users");
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

This fetches data from the backend and renders it into the table. This is the main “live” behavior of the front end.

---

## 10. public/style.css

This file defines the visual design of the app.

Examples:

```css
.container {
  background: rgba(255, 255, 255, 0.9);
  width: 850px;
  padding: 25px 30px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
```

This makes the app look like a polished card-based dashboard.

```css
button {
  padding: 10px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
```

This gives the login and add-user buttons their appearance.

---

## 11. Full request lifecycle

Here is the actual end-to-end flow of the app:

1. The browser loads `/login`.
2. The user enters username and password.
3. The frontend sends `POST /login` with JSON.
4. `server.js` checks `users_login` in MySQL.
5. If valid, it creates a session and saves session metadata.
6. The browser redirects to `/`.
7. The dashboard loads and asks for `/me` and `/users`.
8. The server validates the session and queries MySQL.
9. The user data is returned as JSON.
10. JavaScript populates the table on the page.
11. When a user adds data, the browser submits a `POST /users` request and the table refreshes.

This is how the app appears interactive and fast even without sockets.

---

## 12. How it works “in real time”

This app is not using Socket.IO or WebSockets, so it is not a classic real-time chat server.

Instead, it behaves in a real-time style by doing this:

- front-end calls `fetch()` after page load
- backend returns JSON quickly
- browser updates the DOM immediately
- new data appears in the table without a full page reload

So the app feels responsive and live even though the communication pattern is simple HTTP request/response logic.

---

## 13. Database structure expected by the app

```sql
CREATE DATABASE crud_db;

USE crud_db;

CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  new_id VARCHAR(255)
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

This is what the app expects when it tries to log in and fetch user data.

---

## 14. Summary

The project is a good example of a simple but secure web app architecture:

- browser sends requests
- Express handles routes and session checks
- MySQL stores persistent data
- JavaScript updates the UI on the fly

The main flow is:

login → validate → create session → fetch users → manage records → logout

The important files are:

- [server.js](server.js)
- [db.js](db.js)
- [public/login.html](public/login.html)
- [public/index.html](public/index.html)
- [public/style.css](public/style.css)

Together, these files implement a simple session-protected CRUD application.
