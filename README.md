# Mini CRUD Login App

A small full-stack app built with Node.js, Express, MySQL, and plain HTML/CSS/JavaScript.

This project lets a user log in, access a protected dashboard, and manage records in a MySQL database.

## Features

- login with session-based authentication
- protected routes
- create and view users
- simple dashboard UI
- MySQL-backed data storage

## Project structure

```text
mini-crud/
├── db.js
├── package.json
├── server.js
├── README.md
├── EXPLANATION.md
├── public/
│   ├── index.html
│   ├── login.html
│   ├── style.css
│   └── bg.jpg
└── node_modules/
```

## Prerequisites

- Node.js installed
- MySQL installed and running
- a local database named `crud_db`

## Install dependencies

```bash
npm install
```

## Start MySQL

Make sure MySQL is running locally.

## Create the database and tables

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

Add a sample user:

```sql
INSERT INTO users_login (username, password)
VALUES ('admin', 'admin123');
```

## Run the app

```bash
node server.js
```

Then open:

```text
http://localhost:8000/login
```

Use:

- username: `admin`
- password: `admin123`

## Main files

- [server.js](server.js): backend server, routes, authentication, and database queries
- [db.js](db.js): MySQL connection pool
- [public/login.html](public/login.html): login page
- [public/index.html](public/index.html): dashboard UI
- [public/style.css](public/style.css): page styling

## Notes

This app is not a real-time chat app using WebSockets. It uses browser fetch requests to reload data after actions, which creates a fast interactive feel.

For detailed architecture and explanation, see [EXPLANATION.md](EXPLANATION.md).
