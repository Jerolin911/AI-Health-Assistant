import axios from "axios";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import {
  type TriageRequest,
  type TriageResponse,
  triageResponseSchema
} from "../schemas/triage.js";

export async function analyzeSymptoms(input: TriageRequest): Promise<TriageResponse> {
  try {
    const response = await axios.post(`${config.TRIAGE_SERVICE_URL}/analyze`, input, {
      timeout: 60_000
    });
    return triageResponseSchema.parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new HttpError(
        503,
        "The triage analysis service is unavailable. Please try again shortly."
      );
    }
    throw error;
  }
}
