import axios from "axios";
import type {
  HospitalSearchResponse,
  TriageAnalysis,
  TriageFormValues
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api",
  timeout: 15_000
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function analyzeSymptoms(
  payload: TriageFormValues,
  location?: GeolocationCoordinates
) {
  const { data } = await api.post<{ assessmentId: string | null; analysis: TriageAnalysis }>(
    "/triage/analyze",
    {
      ...payload,
      location: location
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined
    }
  );
  return data;
}

export async function searchHospitals(
  specialty: string,
  location?: GeolocationCoordinates
) {
  const { data } = await api.get<HospitalSearchResponse>("/hospitals/search", {
    params: {
      specialty,
      latitude: location?.latitude,
      longitude: location?.longitude,
      radiusMeters: 15000
    }
  });
  return data;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const { data } = await api.post<{
    token: string;
    user: { id: string; name: string; email: string };
  }>("/auth/register", input);
  return data;
}

export async function loginUser(input: { email: string; password: string }) {
  const { data } = await api.post<{
    token: string;
    user: { id: string; name: string; email: string };
  }>("/auth/login", input);
  return data;
}
