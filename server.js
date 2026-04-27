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

/* =========================
   CLOUDINARY
========================= */
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dlmrfhwcn",
  api_key: process.env.CLOUD_KEY || "TU_API_KEY",
  api_secret: process.env.CLOUD_SECRET || "TU_SECRET"
});

/* =========================
   MYSQL
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST || "monorail.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "TU_PASSWORD",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 17892,
  waitForConnections: true,
  connectionLimit: 10
});

/* TEST CONEXIÓN */
db.getConnection((err, conn) => {
  if (err) {
    console.log("❌ ERROR CONEXIÓN DB:", err);
  } else {
    console.log("✅ DB conectada");
    conn.release();
  }
});

/* =========================
   REGISTRAR OPERADOR
========================= */
app.post("/registrar-operador", (req, res) => {

  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).send("Faltan datos");
  }

  const sql = `
    INSERT INTO operadores (nombre, email)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)
  `;

  db.query(sql, [nombre, email], (err) => {
    if (err) {
      console.log("❌ ERROR OPERADOR:", err);
      return res.status(500).send("Error DB");
    }

    res.send("OK");
  });
});

/* =========================
   GUARDAR PRODUCTOR
========================= */
app.post("/guardar", upload.single("foto"), async (req, res) => {

  try {
    const data = req.body;

    console.log("📥 BODY:", data);     // DEBUG
    console.log("📸 FILE:", req.file); // DEBUG

    if (!data.nombre || !data.dni) {
      return res.status(400).send("Datos incompletos");
    }

    let fotoUrl = null;

    /* SUBIR FOTO */
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          transformation: [
            { width: 2000, height: 2000, crop: "limit" },
            { quality: "auto" }
          ]
        });

        fotoUrl = result.secure_url;

        fs.unlink(req.file.path, () => {});

      } catch (err) {
        console.log("⚠️ ERROR CLOUDINARY:", err);
      }
    }

    /* BUSCAR OPERADOR */
    const getOperador = `SELECT id FROM operadores WHERE email=?`;

    db.query(getOperador, [data.operador_email], (err, result) => {

      if (err) {
        console.log("❌ ERROR BUSCANDO OPERADOR:", err);
        return res.status(500).send("Error DB");
      }

      if (result.length === 0) {
        console.log("⚠️ Operador no encontrado:", data.operador_email);
        return res.status(400).send("Operador no encontrado");
      }

      const operador_id = result[0].id;

      /* INSERT PRODUCTOR */
      const sql = `
        INSERT INTO productores
        (nombre, dni, email, renspa, actividad, feria, observaciones, lat, lng, foto, operador_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(sql, [
        data.nombre,
        data.dni,
        data.email,
        data.renspa,
        data.actividad,
        data.feria,
        data.observaciones,
        data.lat,
        data.lng,
        fotoUrl,
        operador_id
      ], (err) => {

        if (err) {
          console.log("❌ ERROR INSERT PRODUCTOR:", err);
          return res.status(500).send("Error DB");
        }

        console.log("✅ PRODUCTOR GUARDADO");

        res.send("OK");
      });

    });

  } catch (error) {
    console.log("❌ ERROR GENERAL:", error);
    res.status(500).send("Error servidor");
  }
});

/* =========================
   TEST
========================= */
app.get("/", (req, res) => {
  res.send("🚀 API funcionando");
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});