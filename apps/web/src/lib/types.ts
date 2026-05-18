export type Urgency = "Mild" | "Moderate" | "Urgent" | "Emergency";

export type TriageFormValues = {
  symptoms: string;
  issueDetails: string;
  duration: string;
  severity: number;
  age: number;
  medicalHistory?: string;
};

export type TriageAnalysis = {
  possibleIssues: string[];
  urgency: Urgency;
  redFlags: string[];
  explanation: string;
  suggestions: string[];
  followUpQuestions: string[];
  recommendedSpecialist: string;
  specialistReason: string;
  needsMedicalAttention: boolean;
  shouldCallEmergency: boolean;
  searchQuery: string;
  disclaimer: string;
};

export type Hospital = {
  id: string;
  name: string;
  hospitalType: string;
  address: string;
  distanceKm: number | null;
  rating: number | null;
  contactNumber: string | null;
  mapLocation: {
    latitude: number;
    longitude: number;
  } | null;
  website: string | null;
  directionsUrl: string;
  source: "google_places" | "development_fallback";
};

export type HospitalSearchResponse = {
  query: string;
  hospitals: Hospital[];
};
