const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

// Static
app.use(express.static(path.join(__dirname, "public")));

// Session
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
    },
  }),
);

// ================= LOGIN =================

// Login page
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Login API
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM users_login WHERE username=? AND password=?",
      [username, password],
    );

    if (rows.length > 0) {
      req.session.user = username;

      // ✅ Save session in DB
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

// ================= AUTH =================

async function isAuthenticated(req, res, next) {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    // ✅ Check DB session
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

// Refresh session
app.use((req, res, next) => {
  if (req.session.user) {
    req.session.touch();
  }
  next();
});

// ================= ROUTES =================

// Logged in user
app.get("/me", (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user });
  } else {
    res.status(401).json({ error: "Not logged in" });
  }
});

// Protected Home
app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET users
app.get("/users", isAuthenticated, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT new_id AS id, name, email FROM users",
  );
  res.json(rows);
});

// CREATE user
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

// UPDATE
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

// DELETE
app.delete("/users/:id", isAuthenticated, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE new_id=?", [req.params.id]);

    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= LOGOUT =================

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

// ================= START =================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
