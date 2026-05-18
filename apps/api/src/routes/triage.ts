import { Router } from "express";
import { type TriageRequest, type TriageResponse, triageRequestSchema } from "../schemas/triage.js";
import { analyzeSymptoms } from "../services/triage-client.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/analyze", requireAuth, async (req, res, next) => {
  try {
    const input = triageRequestSchema.parse(req.body);
    const analysis = await analyzeSymptoms(input);

    const assessmentId = await persistAssessment(input, analysis, req.user?.id);

    res.status(201).json({ assessmentId, analysis });
  } catch (error) {
    next(error);
  }
});

router.get("/history", requireAuth, async (req, res, next) => {
  try {
    const assessments = await prisma.assessment.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    res.json({ assessments });
  } catch (error) {
    next(error);
  }
});

export { router as triageRouter };

async function persistAssessment(
  input: TriageRequest,
  analysis: TriageResponse,
  userId?: string
) {
  try {
    const assessment = await prisma.assessment.create({
      data: {
        userId,
        symptoms: input.symptoms,
        issueDetails: input.issueDetails,
        duration: input.duration,
        severity: input.severity,
        age: input.age,
        medicalHistory: input.medicalHistory,
        possibleIssues: analysis.possibleIssues,
        urgency: analysis.urgency,
        redFlags: analysis.redFlags,
        suggestions: analysis.suggestions,
        followUpQuestions: analysis.followUpQuestions,
        recommendedSpecialist: analysis.recommendedSpecialist,
        needsMedicalAttention: analysis.needsMedicalAttention,
        disclaimer: analysis.disclaimer
      }
    });
    return assessment.id;
  } catch (error) {
    console.warn("Assessment persistence skipped:", error);
    return null;
  }
}
