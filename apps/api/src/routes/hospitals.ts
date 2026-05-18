import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  buildSpecialtySearchQuery,
  searchHospitals
} from "../services/hospital-provider.js";

const router = Router();

const hospitalSearchSchema = z.object({
  specialty: z.string().min(2).max(120),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().int().min(1000).max(50000).optional()
});

router.get("/search", requireAuth, async (req, res, next) => {
  try {
    const input = hospitalSearchSchema.parse(req.query);
    if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
      throw new HttpError(400, "Current location is required for nearby hospital search");
    }

    const query = buildSpecialtySearchQuery(input.specialty);
    const hospitals = await searchHospitals(input);

    try {
      await prisma.hospitalSearch.create({
        data: {
          userId: req.user?.id,
          specialty: input.specialty,
          query,
          latitude: input.latitude,
          longitude: input.longitude
        }
      });
    } catch (error) {
      console.warn("Hospital search persistence skipped:", error);
    }

    res.json({ query, hospitals });
  } catch (error) {
    next(error);
  }
});

export { router as hospitalsRouter };
