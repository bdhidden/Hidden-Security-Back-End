const mongoose = require("mongoose");

const courseProgressSchema = new mongoose.Schema({
  userId:          { type: String, required: true, index: true },
  courseId:        { type: String, required: true, default: "soc1" },

  // Índice de la etapa actual (0-based, mapea al array COURSE_STEPS del front)
  currentStep:     { type: Number, default: 0 },

  // Set de steps completados — guardamos el índice como string para subdoc
  completedSteps:  { type: [Number], default: [] },

  // Respuestas de los quizzes: { "stepIndex": { score: 0.85, passed: true, attempts: 2 } }
  quizResults:     { type: mongoose.Schema.Types.Mixed, default: {} },

  startedAt:       { type: Date, default: Date.now },
  completedAt:     { type: Date, default: null },
  isCompleted:     { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Índice compuesto único por usuario + curso
courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model("CourseProgress", courseProgressSchema);