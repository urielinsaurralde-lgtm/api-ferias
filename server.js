const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const SECRET = "clave_super_secreta";

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

/* =========================
   CLOUDINARY
========================= */
cloudinary.config({
  cloud_name: "dlmrfhwcn",
  api_key: "824186718736416",
  api_secret: "JR7-Bqp_Ekm0-H70kZR83iH3jJ8"
});

/* =========================
   MYSQL
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST || "monorail.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "IxlfPUfDAujbIQjAtRTgMsrpEaZMVrjb",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 17892
});

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  if (user === "admin" && pass === "1234") {
    const token = jwt.sign({ user }, SECRET, { expiresIn: "8h" });
    return res.json({ token });
  }

  res.status(401).send("Credenciales incorrectas");
});

/* =========================
   MIDDLEWARE TOKEN
========================= */
function verificarToken(req, res, next) {
  const auth = req.headers["authorization"];

  if (!auth) return res.status(403).send("Token requerido");

  const token = auth.split(" ")[1]; // 🔥 "Bearer TOKEN"

  if (!token) return res.status(403).send("Token inválido");

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).send("Token inválido");

    req.user = decoded;
    next();
  });
}

/* =========================
   GUARDAR (PÚBLICO)
========================= */
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
    ], err => {
      if (err) {
        console.log(err);
        return res.status(500).send("Error DB");
      }
      res.send("OK");
    });

  } catch (e) {
    console.log(e);
    res.status(500).send("Error servidor");
  }
});

/* =========================
   PROTEGIDOS
========================= */

// 🔒 LISTAR
app.get("/productores", verificarToken, (req, res) => {
  db.query("SELECT * FROM productores ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});

// 🔒 ELIMINAR
app.delete("/productores/:id", verificarToken, (req, res) => {
  db.query("DELETE FROM productores WHERE id=?", [req.params.id], err => {
    if (err) return res.status(500).send(err);
    res.send("OK");
  });
});

/* =========================
   TEST
========================= */
app.get("/test", (req, res) => {
  res.send("API funcionando 🚀");
});

/* =========================
   SERVER
========================= */
app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor listo 🚀");
});