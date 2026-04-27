const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

/* MYSQL */
const db = mysql.createPool({
  host: "monorail.proxy.rlwy.net",
  user: "root",
  password: "TU_PASSWORD",
  database: "railway",
  port: 17892
});

/* =========================
   REGISTRAR OPERADOR
========================= */
app.post("/registrar-operador", (req, res) => {

  const { nombre, email } = req.body;

  const sql = `
    INSERT INTO operadores (nombre, email)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE nombre=VALUES(nombre)
  `;

  db.query(sql, [nombre, email], (err) => {
    if (err) return res.status(500).send("Error DB");
    res.send("OK");
  });
});

/* =========================
   GUARDAR PRODUCTOR
========================= */
app.post("/guardar", upload.single("foto"), async (req, res) => {

  const data = req.body;

  let fotoUrl = null;

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path);
    fotoUrl = result.secure_url;
    fs.unlinkSync(req.file.path);
  }

  // 🔥 BUSCAR OPERADOR
  const getOperador = `SELECT id FROM operadores WHERE email=?`;

  db.query(getOperador, [data.operador_email], (err, result) => {

    if (err) return res.status(500).send("Error DB");

    if (result.length === 0) {
      return res.status(400).send("Operador no encontrado");
    }

    const operador_id = result[0].id;

    const sql = `
      INSERT INTO productores
      (nombre,dni,email,renspa,actividad,observaciones,foto,operador_id)
      VALUES (?,?,?,?,?,?,?,?)
    `;

    db.query(sql, [
      data.nombre,
      data.dni,
      data.email,
      data.renspa,
      data.actividad,
      data.observaciones,
      fotoUrl,
      operador_id
    ], (err) => {

      if (err) {
        console.log(err);
        return res.status(500).send("Error DB");
      }

      res.send("OK");
    });

  });
});

/* SERVER */
app.listen(3000, () => console.log("🚀 API funcionando"));