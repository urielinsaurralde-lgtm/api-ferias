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
   🔥 CLOUDINARY (CLAVE)
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

    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });

    let fotoUrl = null;

    /* 🔥 SUBIR FOTO */
    if (req.file) {
      try {
        console.log("📸 Subiendo imagen...");

        const result = await cloudinary.uploader.upload(req.file.path, {
          transformation: [
            { width: 1600, height: 1600, crop: "limit" },
            { quality: "auto" }
          ]
        });

        fotoUrl = result.secure_url;

        console.log("✅ Foto subida:", fotoUrl);

        fs.unlinkSync(req.file.path);

      } catch (err) {
        console.log("❌ ERROR CLOUDINARY:", err);
      }
    } else {
      console.log("⚠️ No se recibió archivo");
    }

    /* 🔥 BUSCAR OPERADOR */
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
          console.log("❌ DB ERROR:", err);
          return res.status(500).send("Error DB");
        }

        res.send("OK");
      });

    });

  } catch (e) {
    console.log("❌ ERROR GENERAL:", e);
    res.status(500).send("Error servidor");
  }
});

/* =========================
   SERVER
========================= */
app.listen(3000, () => console.log("🚀 API funcionando"));