require("dotenv").config();

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

const SECRET = process.env.JWT_SECRET || "clave_super_secreta";

// MULTER
const upload = multer({ dest: "uploads/" });

// CLOUDINARY
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
});

// MYSQL
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10
});

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    const token = jwt.sign({ user }, SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Credenciales incorrectas" });
});

// 🔐 MIDDLEWARE
function verificarToken(req, res, next) {
  const header = req.headers["authorization"];

  if (!header) return res.status(403).json({ error: "Token requerido" });

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.user = decoded;
    next();
  });
}

// 👉 GUARDAR
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
          { width: 1600, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" }
        ]
      });

      fotoUrl = result.secure_url;
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
      data.observaciones,
      data.lat,
      data.lng,
      fotoUrl,
      fecha
    ], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true });
    });

  } catch (e) {
    res.status(500).json({ error: "Error servidor" });
  }
});

// 👉 OBTENER (PROTEGIDO)
app.get("/productores", verificarToken, (req, res) => {
  db.query("SELECT * FROM productores ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 👉 DELETE (PROTEGIDO)
app.delete("/productores/:id", verificarToken, (req, res) => {
  db.query("DELETE FROM productores WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// TEST
app.get("/test", (req, res) => {
  res.send("API OK 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor en puerto " + PORT));