const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// 📸 MULTER (temporal)
const upload = multer({ dest: "uploads/" });

// ☁️ CLOUDINARY
cloudinary.config({
  cloud_name: "dlmrfhwcn",
  api_key: "824186718736416",
  api_secret: "JR7-Bqp_Ekm0-H70kZR83iH3jJ8"
});

// 🔗 MYSQL
const db = mysql.createPool({
  host: process.env.DB_HOST || "monorail.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "IxlfPUfDAujbIQjAtRTgMsrpEaZMVrjb",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 17892,
  waitForConnections: true,
  connectionLimit: 10
});


// 👉 GUARDAR DATOS
app.post("/guardar", upload.single("foto"), async (req, res) => {
  try {
    const data = req.body;
    let fotoUrl = null;

    // 📸 subir imagen optimizada a cloudinary
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        transformation: [
          { width: 1800, height: 1800, crop: "limit" },
          { quality: "auto" },
          { format: "webp" }
        ]
      });

      fotoUrl = result.secure_url;

      // 🧹 borrar archivo local
      fs.unlinkSync(req.file.path);
    }

    const sql = `
      INSERT INTO productores 
      (nombre, dni, email, renspa, actividad, feria, lat, lng, foto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
      data.nombre,
      data.dni,
      data.email,
      data.renspa,
      data.actividad,
      data.feria,
      data.lat,
      data.lng,
      fotoUrl
    ], (err) => {
      if (err) {
        console.log("ERROR DB:", err);
        return res.status(500).send("Error DB");
      }

      res.send("OK");
    });

  } catch (error) {
    console.log("ERROR CLOUDINARY:", error);
    res.status(500).send("Error subida imagen");
  }
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


// 👉 PUERTO (RENDER)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});