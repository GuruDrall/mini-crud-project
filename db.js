const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456", // same you used above
  database: "crud_db",
  port: 3306,
});

module.exports = pool;
