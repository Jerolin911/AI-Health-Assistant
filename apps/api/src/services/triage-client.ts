import axios from "axios";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";
import {
  type TriageRequest,
  type TriageResponse,
  triageResponseSchema
} from "../schemas/triage.js";

export async function analyzeSymptoms(input: TriageRequest): Promise<TriageResponse> {
  const triageBaseUrl = config.TRIAGE_SERVICE_URL.replace(/\/+$/, "");

  try {
    const response = await axios.post(`${triageBaseUrl}/analyze`, input, {
      timeout: 60_000
    });
    return triageResponseSchema.parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Triage service call failed", {
        triageBaseUrl,
        status: error.response?.status,
        response: error.response?.data,
        code: error.code,
        message: error.message
      });

      throw new HttpError(
        503,
        `The triage analysis service is unavailable. Please try again shortly. (${error.response?.status ?? error.code ?? "upstream_error"})`
      );
    }
    throw error;
  }
}
