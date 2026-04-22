const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();

// 🔐 CONFIG
const SECRET = process.env.JWT_SECRET || "clave_super_secreta";

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 SERVIR FRONT
app.use(express.static(path.join(__dirname, "public")));

// 📸 MULTER
const upload = multer({ dest: "uploads/" });

// ☁️ CLOUDINARY (⚠️ ideal mover a ENV)
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "dlmrfhwcn",
  api_key: process.env.CLOUD_KEY || "824186718736416",
  api_secret: process.env.CLOUD_SECRET || "JR7-Bqp_Ekm0-H70kZR83iH3jJ8"
});

// 🗄️ MYSQL
const db = mysql.createPool({
  host: process.env.DB_HOST || "monorail.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "IxlfPUfDAujbIQjAtRTgMsrpEaZMVrjb",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 17892,
  waitForConnections: true,
  connectionLimit: 10
});


// =========================
// 🔐 LOGIN
// =========================
app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (!user || !pass) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  if (user === "admin" && pass === "1234") {
    const token = jwt.sign({ user }, SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }

  return res.status(401).json({ error: "Credenciales incorrectas" });
});


// =========================
// 🔐 MIDDLEWARE TOKEN
// =========================
function verificarToken(req, res, next) {

  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(403).json({ error: "Token requerido" });
  }

  // 👉 Soporta "Bearer TOKEN" o solo TOKEN
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido" });
    }

    req.user = decoded;
    next();
  });
}


// =========================
// 📥 GUARDAR DATOS
// =========================
app.post("/guardar", upload.single("foto"), async (req, res) => {
  try {

    const data = req.body;

    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });

    let fotoUrl = null;

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        transformation: [
          { width: 2000, height: 2000, crop: "limit" },
          { quality: "auto" }
        ]
      });

      fotoUrl = result.secure_url;

      // eliminar temporal
      fs.unlinkSync(req.file.path);
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
      data.observaciones || null,
      data.lat,
      data.lng,
      fotoUrl,
      fecha
    ], (err) => {

      if (err) {
        console.log("ERROR DB:", err);
        return res.status(500).json({ error: "Error en base de datos" });
      }

      res.json({ ok: true });
    });

  } catch (error) {
    console.log("ERROR SERVER:", error);
    res.status(500).json({ error: "Error interno" });
  }
});


// =========================
// 📊 GET DATOS (PROTEGIDO)
// =========================
app.get("/productores", verificarToken, (req, res) => {

  db.query("SELECT * FROM productores ORDER BY id DESC", (err, results) => {

    if (err) {
      console.log("ERROR MYSQL:", err);
      return res.status(500).json({ error: "Error DB" });
    }

    res.json(results);
  });
});


// =========================
// ❌ DELETE (PROTEGIDO)
// =========================
app.delete("/productores/:id", verificarToken, (req, res) => {

  db.query("DELETE FROM productores WHERE id=?", [req.params.id], (err) => {

    if (err) {
      console.log("ERROR DELETE:", err);
      return res.status(500).json({ error: "Error al eliminar" });
    }

    res.json({ ok: true });
  });
});


// =========================
// 🧪 TEST
// =========================
app.get("/test", (req, res) => {
  res.send("API funcionando 🚀");
});


// =========================
// 🚀 START
// =========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});