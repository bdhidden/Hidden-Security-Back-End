const express  = require("express");
const usersDbRouter = express.Router();

const { CV }              = require("../models/cvModel");
const enterpriseMiddleware = require("../middleware/enterpriseMiddleware");
const auth                 = require("../config/firebase");

const esProduccion = process.env.NODE_ENV === "production";

// ─── GET /api/users-database ──────────────────────────────────────────────────
// Devuelve CVs + claims relevantes de cada usuario, con filtros y paginación.
// Solo accesible para enterprise.
//
// Query params:
//   page              número de página (default 1)
//   limit             resultados por página (default 15)
//   search            busca en nombre, apellido, email, headline
//   declaredSkills    skills declaradas por el usuario, separadas por coma
//   certifiedSkills   skills certificadas por Hidden, separadas por coma
//   certifiedOnly     "true" → solo usuarios con userCertificated
//   availability      filtra por disponibilidad exacta
//   modality          filtra por modalidad de trabajo (Remoto/Híbrido/Presencial)
usersDbRouter.get("/api/users-database", enterpriseMiddleware, async (req, res) => {
  try {
    const {
      page  = 1,
      limit = 15,
      search           = "",
      declaredSkills   = "",
      certifiedSkills  = "",
      certifiedOnly    = "false",
      availability     = "",
      modality         = "",
    } = req.query;

    const parsedPage  = parseInt(page);
    const parsedLimit = parseInt(limit);

    if (isNaN(parsedPage)  || parsedPage  < 1) return res.status(400).json({ message: "page debe ser un entero positivo" });
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) return res.status(400).json({ message: "limit debe ser entre 1 y 100" });

    const declaredSkillsArr  = declaredSkills  ? declaredSkills.split(",").map(s => s.trim()).filter(Boolean)  : [];
    const certifiedSkillsArr = certifiedSkills ? certifiedSkills.split(",").map(s => s.trim()).filter(Boolean) : [];

    // ── Filtro Mongo: lo que se puede filtrar a nivel DB ───────────────────
    const filter = {};

    if (search) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { "personalInfo.firstName": regex },
        { "personalInfo.lastName":  regex },
        { "personalInfo.email":     regex },
        { "personalInfo.headline":  regex },
      ];
    }

    if (declaredSkillsArr.length > 0) {
      // al menos una de las skills declaradas solicitadas
      filter.skills = { $in: declaredSkillsArr };
    }

    if (availability) {
      filter.availability = availability;
    }

    if (modality) {
      filter["workPreferences.modality"] = modality;
    }

    // ── Traer TODOS los matches de Mongo (sin paginar aún) ─────────────────
    // Necesario porque certifiedOnly y certifiedSkills dependen de Firebase claims,
    // que no se pueden filtrar en la query de Mongo.
    const allMatches = await CV.find(filter).lean();

    if (!allMatches.length) {
      return res.json({
        data: [],
        meta: { total: 0, page: parsedPage, limit: parsedLimit, totalPages: 0 },
        unmatchedSkills: { declared: [], certified: [] },
      });
    }

    // ── Traer claims de Firebase para cada userId en paralelo ──────────────
    const withClaims = await Promise.all(
      allMatches.map(async (cv) => {
        let claims = {};
        try {
          const userRecord = await auth.getUser(cv.userId);
          claims = userRecord.customClaims || {};
        } catch (err) {
          console.error(`No se pudo obtener claims de ${cv.userId}: ${err.message}`);
        }

        return {
          userId:                  cv.userId,
          personalInfo:            cv.personalInfo,
          skills:                  cv.skills || [],
          experience:              cv.experience || [],
          education:               cv.education || [],
          certifications:          cv.certifications || [],
          languages:               cv.languages || [],
          projects:                cv.projects || [],
          availability:            cv.availability,
          workPreferences:         cv.workPreferences,
          updatedAt:               cv.updatedAt,
          userCertificated:        !!claims.userCertificated,
          skillsCertifiedByHidden: Array.isArray(claims.skillsCertifiedByHidden)
            ? claims.skillsCertifiedByHidden
            : [],
        };
      })
    );

    // ── Filtros que dependen de claims (post-fetch) ────────────────────────
    let filtered = withClaims;

    if (certifiedOnly === "true") {
      filtered = filtered.filter(u => u.userCertificated);
    }

    if (certifiedSkillsArr.length > 0) {
      filtered = filtered.filter(u =>
        certifiedSkillsArr.some(skill => u.skillsCertifiedByHidden.includes(skill))
      );
    }

    // ── Calcular skills solicitadas que NO aparecen en ningún resultado ────
    // (para el mensaje "no encontramos candidatos con: X, Y")
    const allDeclaredInResults  = new Set(filtered.flatMap(u => u.skills));
    const allCertifiedInResults = new Set(filtered.flatMap(u => u.skillsCertifiedByHidden));

    const unmatchedDeclared  = declaredSkillsArr.filter(s  => !allDeclaredInResults.has(s));
    const unmatchedCertified = certifiedSkillsArr.filter(s => !allCertifiedInResults.has(s));

    // ── Ordenar: certificados primero, luego por última actualización ──────
    filtered.sort((a, b) => {
      if (a.userCertificated !== b.userCertificated) return a.userCertificated ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    // ── Paginar sobre el resultado ya filtrado ─────────────────────────────
    const total      = filtered.length;
    const totalPages = Math.ceil(total / parsedLimit);
    const skip       = (parsedPage - 1) * parsedLimit;
    const pageData   = filtered.slice(skip, skip + parsedLimit);

    res.json({
      data: pageData,
      meta: { total, page: parsedPage, limit: parsedLimit, totalPages },
      unmatchedSkills: {
        declared:  unmatchedDeclared,
        certified: unmatchedCertified,
      },
    });
  } catch (err) {
    console.error(esProduccion ? "Error GET /users-database" : `Error GET /users-database: ${err}`);
    res.status(500).json({ message: "Error al obtener la base de usuarios" });
  }
});

// ─── GET /api/users-database/skills-summary ──────────────────────────────────
// Devuelve la lista de skills declaradas y certificadas que existen en la DB,
// para poblar los checkboxes de filtro dinámicamente.
usersDbRouter.get("/api/users-database/skills-summary", enterpriseMiddleware, async (req, res) => {
  try {
    const cvs = await CV.find({}, { skills: 1, userId: 1 }).lean();

    const declaredSet = new Set();
    cvs.forEach(cv => (cv.skills || []).forEach(s => declaredSet.add(s)));

    // Claims — recolectar skillsCertifiedByHidden de todos los usuarios con CV
    const certifiedSet = new Set();
    await Promise.all(cvs.map(async (cv) => {
      try {
        const userRecord = await auth.getUser(cv.userId);
        const claims = userRecord.customClaims || {};
        (claims.skillsCertifiedByHidden || []).forEach(s => certifiedSet.add(s));
      } catch { /* ignorar usuarios no encontrados */ }
    }));

    res.json({
      declaredSkills:  Array.from(declaredSet).sort(),
      certifiedSkills: Array.from(certifiedSet).sort(),
    });
  } catch (err) {
    console.error(esProduccion ? "Error GET /skills-summary" : `Error GET /skills-summary: ${err}`);
    res.status(500).json({ message: "Error al obtener resumen de skills" });
  }
});

module.exports = usersDbRouter;