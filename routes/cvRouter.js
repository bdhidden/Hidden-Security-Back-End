const express      = require("express");
const cvRouter     = express.Router();
const { CV }       = require("../models/cvModel");
const certifiedMiddleware = require("../middleware/certificatedMiddleware");
const verifyToken  = require("../middleware/authMiddleware");

const esProduccion = process.env.NODE_ENV === "production";

// ─── GET /api/cv/me ───────────────────────────────────────────────────────────
// Devuelve el CV del usuario autenticado (o null si no existe)
cvRouter.get("/api/cv/me", verifyToken, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.user.uid }).lean();
    res.json({ data: cv ?? null });
  } catch (err) {
    console.error(esProduccion ? "Error GET /cv/me" : `Error GET /cv/me: ${err}`);
    res.status(500).json({ message: "Error al obtener el CV" });
  }
});

// ─── PUT /api/cv/me ───────────────────────────────────────────────────────────
// Crea o actualiza el CV completo del usuario (upsert)
cvRouter.put("/api/cv/me", verifyToken, async (req, res) => {
  try {
    const {
      personalInfo,
      experience,
      education,
      certifications,
      skills,
      languages,
      projects,
      availability,
      workPreferences,
    } = req.body;

    const update = {};
    if (personalInfo   !== undefined) update.personalInfo   = personalInfo;
    if (experience     !== undefined) update.experience     = experience;
    if (education      !== undefined) update.education      = education;
    if (certifications !== undefined) update.certifications = certifications;
    if (skills         !== undefined) update.skills         = skills;
    if (languages      !== undefined) update.languages      = languages;
    if (projects       !== undefined) update.projects       = projects;
    if (availability   !== undefined) update.availability   = availability;
    if (workPreferences!== undefined) update.workPreferences= workPreferences;

    const cv = await CV.findOneAndUpdate(
      { userId: req.user.uid },
      { $set: update },
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    res.json({ message: "CV guardado correctamente", data: cv });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: "Error de validación", errors });
    }
    console.error(esProduccion ? "Error PUT /cv/me" : `Error PUT /cv/me: ${err}`);
    res.status(500).json({ message: "Error al guardar el CV" });
  }
});

// ─── DELETE /api/cv/me ────────────────────────────────────────────────────────
cvRouter.delete("/api/cv/me", verifyToken, async (req, res) => {
  try {
    await CV.findOneAndDelete({ userId: req.user.uid });
    res.json({ message: "CV eliminado" });
  } catch (err) {
    console.error(esProduccion ? "Error DELETE /cv/me" : `Error DELETE /cv/me: ${err}`);
    res.status(500).json({ message: "Error al eliminar el CV" });
  }
});

// ─── GET /api/cv/user/:userId ─────────────────────────────────────────────────
// Solo empresas pueden ver el CV de un postulante específico
const enterpriseMiddleware = require("../middleware/enterpriseMiddleware");

cvRouter.get("/api/cv/user/:userId", enterpriseMiddleware, async (req, res) => {
  try {
    const cv = await CV.findOne({ userId: req.params.userId }).lean();
    if (!cv) return res.status(404).json({ message: "CV no encontrado" });
    res.json({ data: cv });
  } catch (err) {
    console.error(esProduccion ? "Error GET /cv/user/:userId" : `Error GET /cv/user/:userId: ${err}`);
    res.status(500).json({ message: "Error al obtener el CV" });
  }
});

module.exports = cvRouter;