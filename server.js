const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 conexión MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// 👉 GUARDAR DATOS
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
      console.log("ERROR MYSQL:", err);
      return res.status(500).send(err.message);
    }
    res.send("OK");
  });
});

// 👉 OBTENER DATOS
app.get("/productores", (req, res) => {
  db.query("SELECT * FROM productores", (err, results) => {
    if (err) {
      console.log("ERROR MYSQL:", err);
      return res.status(500).send(err.message);
    }
    res.json(results);
  });
});

// 👉 TEST
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// 👉 PUERTO (IMPORTANTE PARA RENDER)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});