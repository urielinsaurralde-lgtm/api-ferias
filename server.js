const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 conexión MySQL
const db = mysql.createPool({
  host: "mysql.railway.internal",
  user: "root",
  password: "IxlfPUfDAujbIQjAtRTgMsrpEaZMVrjb",
  database: "railway",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});
// endpoint
app.post("/guardar", (req, res) => {
  const data = req.body;

  const sql = `
    INSERT INTO productores 
    (nombre, dni, email, renspa, actividad, feria, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    data.nombre,
    data.dni,
    data.email,
    data.renspa,
    data.actividad,
    data.feria,
    data.lat,
    data.lng
  ], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Error");
    }
    res.send("OK");
  });
});

app.listen(3000, () => {
  console.log("🚀 Servidor en http://localhost:3000");
});
app.get("/", (req, res) => {
  res.send("Servidor funcionando 🚀");
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo");
});