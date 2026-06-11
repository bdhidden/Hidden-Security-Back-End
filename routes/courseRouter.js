const express        = require("express");
const courseRouter   = express.Router();
const CourseProgress = require("../models/CourseSchema");
const verifyToken    = require("../middleware/authMiddleware");
const auth           = require("../config/firebase");

const COURSE_ID       = "soc1";
const PASSING_SCORE   = 0.70; // 70% mínimo para aprobar un quiz
const esProduccion    = process.env.NODE_ENV === "production";

// ─── Middleware: verificar que el usuario tiene un plan activo ─────────────────
async function requireActivePlan(req, res, next) {
  try {
    const uid        = req.user.uid;
    const userRecord = await auth.getUser(uid);
    const claims     = userRecord.customClaims || {};

    const purchases      = Array.isArray(claims.purchases) ? claims.purchases : [];
    const purchaseExpiry = claims.purchaseExpiry || {};
    const now            = new Date();

    // Buscar cualquier plan de usuario vigente (starter, pro, elite)
    const USER_PLANS = ["starter", "pro", "elite"];
    const hasActivePlan = USER_PLANS.some(planId => {
      if (!purchases.includes(planId)) return false;
      const expiryStr = purchaseExpiry[planId];
      if (!expiryStr) return false;
      return new Date(expiryStr) > now;
    });

    if (!hasActivePlan) {
      return res.status(403).json({
        message: "SIN_MEMBRESÍA_ACTIVA",
        detail:  "Necesitás una membresía activa para acceder al contenido del curso.",
        code:    "NO_ACTIVE_MEMBERSHIP",
      });
    }

    req.userClaims = claims;
    next();
  } catch (err) {
    console.error("requireActivePlan error:", err.message);
    res.status(500).json({ message: "Error verificando membresía" });
  }
}

// ─── GET /api/course/soc1/progress ───────────────────────────────────────────
// Obtiene el progreso del usuario. Si no existe, lo crea.
courseRouter.get("/api/course/:courseId/progress", verifyToken, requireActivePlan, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId       = req.user.uid;

    let progress = await CourseProgress.findOne({ userId, courseId });

    if (!progress) {
      progress = await CourseProgress.create({ userId, courseId });
    }

    res.json({ data: progress });
  } catch (err) {
    console.error(esProduccion ? "Error GET progress" : `Error GET progress: ${err}`);
    res.status(500).json({ message: "Error al obtener progreso" });
  }
});

// ─── PATCH /api/course/soc1/progress/step ────────────────────────────────────
// Avanza al siguiente step y marca el actual como completado
courseRouter.patch("/api/course/:courseId/progress/step", verifyToken, requireActivePlan, async (req, res) => {
  try {
    const { courseId }   = req.params;
    const userId         = req.user.uid;
    const { stepIndex, totalSteps } = req.body;

    if (typeof stepIndex !== "number" || stepIndex < 0) {
      return res.status(400).json({ message: "stepIndex inválido" });
    }

    let progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = await CourseProgress.create({ userId, courseId });
    }

    // Agregar al set de completados si no está
    if (!progress.completedSteps.includes(stepIndex)) {
      progress.completedSteps.push(stepIndex);
    }

    // Avanzar currentStep
    const nextStep = stepIndex + 1;
    progress.currentStep = Math.max(progress.currentStep, nextStep);

    // Verificar si completó el curso
    if (totalSteps && progress.completedSteps.length >= totalSteps && !progress.isCompleted) {
      progress.isCompleted  = true;
      progress.completedAt  = new Date();
    }

    await progress.save();
    res.json({ data: progress });
  } catch (err) {
    console.error(esProduccion ? "Error PATCH step" : `Error PATCH step: ${err}`);
    res.status(500).json({ message: "Error al guardar progreso" });
  }
});

// ─── PATCH /api/course/soc1/progress/quiz ────────────────────────────────────
// Guarda el resultado de un quiz
courseRouter.patch("/api/course/:courseId/progress/quiz", verifyToken, requireActivePlan, async (req, res) => {
  try {
    const { courseId }            = req.params;
    const userId                  = req.user.uid;
    const { stepIndex, score, attempts } = req.body;

    if (typeof stepIndex !== "number" || typeof score !== "number") {
      return res.status(400).json({ message: "stepIndex y score son requeridos" });
    }

    if (score < 0 || score > 1) {
      return res.status(400).json({ message: "score debe ser entre 0 y 1" });
    }

    let progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = await CourseProgress.create({ userId, courseId });
    }

    const passed = score >= PASSING_SCORE;

    // Guardar resultado del quiz (sobrescribe si reintenta)
    progress.quizResults = {
      ...progress.quizResults,
      [String(stepIndex)]: {
        score,
        passed,
        attempts: attempts ?? 1,
        lastAttemptAt: new Date(),
      },
    };

    // Marcar el step como completado solo si aprobó
    if (passed && !progress.completedSteps.includes(stepIndex)) {
      progress.completedSteps.push(stepIndex);
      progress.currentStep = Math.max(progress.currentStep, stepIndex + 1);
    }

    await progress.save();
    res.json({
      data: progress,
      passed,
      score,
      passingScore: PASSING_SCORE,
    });
  } catch (err) {
    console.error(esProduccion ? "Error PATCH quiz" : `Error PATCH quiz: ${err}`);
    res.status(500).json({ message: "Error al guardar resultado del quiz" });
  }
});

module.exports = courseRouter;