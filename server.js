const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 📁 SERVIR PANEL
app.use(express.static(path.join(__dirname, "public")));

// 📸 MULTER
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

    // 📅 fecha Argentina
    const fecha = new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires"
    });

    let fotoUrl = null;

    // 📸 subir imagen
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        transformation: [
          { width: 2000, height: 2000, crop: "limit" },
          { quality: "auto" },
          { fetch_format: "auto" }
        ]
      });

      fotoUrl = result.secure_url;

      // 🧹 borrar archivo local
      fs.unlinkSync(req.file.path);
    }

    // 🔥 QUERY ACTUALIZADA CON OBSERVACIONES
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
      data.observaciones, // 🔥 NUEVO CAMPO
      data.lat,
      data.lng,
      fotoUrl,
      fecha
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
  db.query("SELECT * FROM productores ORDER BY id DESC", (err, results) => {
    if (err) {
      console.log("ERROR MYSQL:", err);
      return res.status(500).send(err.message);
    }
    res.json(results);
  });
});

// 👉 ELIMINAR
app.delete("/productores/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM productores WHERE id = ?", [id], (err) => {
    if (err) {
      console.log("ERROR DELETE:", err);
      return res.status(500).send("Error");
    }

    res.send("Eliminado");
  });
});

// 👉 TEST
app.get("/test", (req, res) => {
  res.send("API funcionando 🚀");
});

// 👉 PUERTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor corriendo en puerto " + PORT);
});