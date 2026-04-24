const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

const SECRET = process.env.JWT_SECRET || "clave_super_secreta";

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

db.getConnection((err, conn) => {
  if (err) {
    console.log("❌ ERROR CONEXIÓN DB:", err);
  } else {
    console.log("✅ DB conectada");
    conn.release();
  }
});

/* =========================
   REGISTRAR OPERADOR 🔥
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
   LOGIN
========================= */
app.post("/login", (req, res) => {
  try {
    const { user, pass } = req.body;

    if (!user || !pass) {
      return res.status(400).send("Faltan datos");
    }

    const USER = process.env.ADMIN_USER || "admin";
    const PASS = process.env.ADMIN_PASS || "1234";

    if (user === USER && pass === PASS) {
      const token = jwt.sign({ user }, SECRET, { expiresIn: "8h" });
      return res.json({ token });
    }

    res.status(401).send("Credenciales incorrectas");

  } catch (err) {
    console.log("❌ ERROR LOGIN:", err);
    res.status(500).send("Error servidor");
  }
});

/* =========================
   GUARDAR
========================= */
app.post("/guardar", upload.single("foto"), async (req, res) => {

  try {
    const data = req.body;

    if (!data.nombre || !data.dni) {
      return res.status(400).send("Datos incompletos");
    }

    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });

    let fotoUrl = null;

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

    const sql = `
      INSERT INTO productores 
      (nombre, dni, email, renspa, actividad, feria, observaciones, lat, lng, foto, fecha)
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
      fecha
    ], (err) => {

      if (err) {
        console.log("❌ DB ERROR:", err);
        return res.status(500).send("Error DB");
      }

      res.send("OK");
    });

  } catch (e) {
    console.log("❌ ERROR GUARDAR:", e);
    res.status(500).send("Error servidor");
  }
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});