// MODERN SOC CONFIG
const SOC1_MODULE_SIZE  = 8; // 7 PDFs + 1 quiz por módulo
const SOC1_MODULE_COUNT = 8; // 8 módulos totales

const soc1QuizSteps = Array.from(
  { length: SOC1_MODULE_COUNT },
  (_, i) => (i + 1) * SOC1_MODULE_SIZE - 1
); // → [7, 15, 23, 31, 39, 47, 55, 63]

const COURSES = {
  soc1: {
    totalSteps:       SOC1_MODULE_SIZE * SOC1_MODULE_COUNT, // 64
    quizSteps:        soc1QuizSteps,                         // [7,15,23,31,39,47,55,63]
    questionsPerQuiz: 8,
    passingScore:     0.70,
  },
};

const VALID_COURSE_IDS = Object.keys(COURSES);

module.exports = { COURSES, VALID_COURSE_IDS };