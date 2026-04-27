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
  port: process.env.DB_PORT || 17892
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

  try {
    const data = req.body;

    console.log("📥 BODY:", data);
    console.log("📸 FILE:", req.file);

    /* 📅 FECHA */
    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });

    let fotoUrl = null;

    /* 📸 SUBIR FOTO */
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
        console.log("✅ FOTO SUBIDA:", fotoUrl);

      } catch (err) {
        console.log("❌ ERROR CLOUDINARY:", err);
      }
    } else {
      console.log("⚠️ NO SE RECIBIÓ FOTO");
    }

    /* 🔎 BUSCAR OPERADOR */
    const getOperador = `SELECT id FROM operadores WHERE email=?`;

    db.query(getOperador, [data.operador_email], (err, result) => {

      if (err) {
        console.log("❌ ERROR BUSCANDO OPERADOR:", err);
        return res.status(500).send("Error DB");
      }

      if (result.length === 0) {
        return res.status(400).send("Operador no encontrado");
      }

      const operador_id = result[0].id;

      /* 💾 INSERT */
      const sql = `
        INSERT INTO productores
        (nombre,dni,email,renspa,actividad,feria,observaciones,lat,lng,foto,fecha,operador_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
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
        fecha,
        operador_id
      ], (err) => {

        if (err) {
          console.log("❌ ERROR INSERT:", err);
          return res.status(500).send("Error DB");
        }

        console.log("✅ GUARDADO COMPLETO");

        res.send("OK");
      });

    });

  } catch (error) {
    console.log("❌ ERROR GENERAL:", error);
    res.status(500).send("Error servidor");
  }
});

/* SERVER */
app.listen(3000, () => console.log("🚀 API funcionando"));