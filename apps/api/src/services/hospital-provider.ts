import axios from "axios";
import { config } from "../config.js";
import { HttpError } from "../lib/http-error.js";

export type HospitalSearchInput = {
  specialty: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

export type HospitalResult = {
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

export function buildSpecialtySearchQuery(specialty: string) {
  const normalized = specialty.toLowerCase();
  if (normalized.includes("cardio")) return "cardiology hospitals near me";
  if (normalized.includes("neuro")) return "neurology hospitals near me";
  if (normalized.includes("dermat")) return "dermatology hospitals near me";
  if (normalized.includes("ortho")) return "orthopedic hospitals near me";
  if (normalized.includes("gyne") || normalized.includes("obstetric")) {
    return "women and child hospitals near me";
  }
  if (normalized.includes("pediatric")) return "children hospitals near me";
  if (normalized.includes("dent")) return "dental hospitals near me";
  if (normalized.includes("ent") || normalized.includes("otolaryng")) {
    return "ENT hospitals near me";
  }
  if (normalized.includes("emergency")) return "emergency hospitals near me";
  return `${specialty} hospitals near me`;
}

export async function searchHospitals(input: HospitalSearchInput): Promise<HospitalResult[]> {
  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") {
    throw new HttpError(400, "Current location is required for nearby hospital search");
  }

  if (!config.GOOGLE_PLACES_API_KEY) {
    console.warn("Google Places API key is not configured; returning fallback hospital results.");
    return buildFallbackHospitalResults(input);
  }

  try {
    return await searchGooglePlaces({
      ...input,
      latitude: input.latitude,
      longitude: input.longitude
    });
  } catch (error) {
    if (isGooglePlacesFallbackError(error)) {
      console.warn("Google Places lookup failed; returning fallback hospital results.", error instanceof Error ? error.message : error);
      return buildFallbackHospitalResults(input);
    }
    throw error;
  }
}

function isGooglePlacesFallbackError(error: unknown) {
  if (error instanceof HttpError && error.status === 502 && typeof error.message === "string") {
    return error.message.includes("Google Places search failed");
  }
  return false;
}

async function searchGooglePlaces(
  input: HospitalSearchInput & { latitude: number; longitude: number }
): Promise<HospitalResult[]> {
  const keyword = buildSpecialtyKeyword(input.specialty);
  const response = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
    params: {
      location: `${input.latitude},${input.longitude}`,
      radius: input.radiusMeters ?? 15_000,
      keyword,
      type: "hospital",
      key: config.GOOGLE_PLACES_API_KEY
    },
    timeout: 10_000
  });

  if (response.data.status && response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
    throw new HttpError(
      502,
      `Google Places search failed: ${response.data.error_message ?? response.data.status}`
    );
  }

  const results = Array.isArray(response.data.results) ? response.data.results : [];
  return results
    .map((place: any): HospitalResult | null => {
      const latitude = place.geometry?.location?.lat;
      const longitude = place.geometry?.location?.lng;
      if (typeof latitude !== "number" || typeof longitude !== "number") return null;

      const distance = roundDistance(distanceKm(input.latitude, input.longitude, latitude, longitude));
      if (distance > 50) return null;

      return {
        id: place.place_id,
        name: place.name,
        hospitalType: inferHospitalType(input.specialty, place.types ?? []),
        address: place.vicinity ?? place.formatted_address ?? "Address unavailable",
        distanceKm: distance,
        rating: typeof place.rating === "number" ? place.rating : null,
        contactNumber: null,
        mapLocation: { latitude, longitude },
        website: null,
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination_place_id=${place.place_id}&destination=${latitude},${longitude}`,
        source: "google_places"
      };
    })
    .filter((hospital: HospitalResult | null): hospital is HospitalResult => hospital !== null)
    .sort((a: HospitalResult, b: HospitalResult) => hospitalScore(a) - hospitalScore(b))
    .slice(0, 8);
}

function hospitalScore(hospital: HospitalResult) {
  const distanceScore = hospital.distanceKm ?? 50;
  const ratingPenalty = hospital.rating ? (5 - hospital.rating) * 1.5 : 2;
  return distanceScore + ratingPenalty;
}

function buildFallbackHospitalResults(input: HospitalSearchInput): HospitalResult[] {
  const baseLatitude = input.latitude!;
  const baseLongitude = input.longitude!;
  const hospitalType = inferHospitalType(input.specialty, []);
  const normalizedSpecialty = input.specialty.trim() || "Healthcare";

  return [
    {
      id: `development-fallback-1-${normalizedSpecialty}`,
      name: `${normalizedSpecialty} care center`,
      hospitalType,
      address: "Nearby healthcare facility",
      distanceKm: 1.4,
      rating: 4.2,
      contactNumber: "+1 (555) 123-4567",
      mapLocation: {
        latitude: baseLatitude + 0.008,
        longitude: baseLongitude - 0.006
      },
      website: null,
      directionsUrl: `https://www.google.com/maps/search/?api=1&query=${baseLatitude + 0.008},${baseLongitude - 0.006}`,
      source: "development_fallback"
    },
    {
      id: `development-fallback-2-${normalizedSpecialty}`,
      name: `${normalizedSpecialty} specialist clinic`,
      hospitalType,
      address: "Nearby medical clinic",
      distanceKm: 2.9,
      rating: 3.9,
      contactNumber: "+1 (555) 234-5678",
      mapLocation: {
        latitude: baseLatitude - 0.01,
        longitude: baseLongitude + 0.005
      },
      website: null,
      directionsUrl: `https://www.google.com/maps/search/?api=1&query=${baseLatitude - 0.01},${baseLongitude + 0.005}`,
      source: "development_fallback"
    },
    {
      id: `development-fallback-3-${normalizedSpecialty}`,
      name: `${normalizedSpecialty} urgent care`,
      hospitalType,
      address: "Nearby urgent care",
      distanceKm: 4.7,
      rating: 4.0,
      contactNumber: "+1 (555) 345-6789",
      mapLocation: {
        latitude: baseLatitude + 0.012,
        longitude: baseLongitude + 0.012
      },
      website: null,
      directionsUrl: `https://www.google.com/maps/search/?api=1&query=${baseLatitude + 0.012},${baseLongitude + 0.012}`,
      source: "development_fallback"
    }
  ];
}

function buildSpecialtyKeyword(specialty: string) {
  const normalized = specialty.toLowerCase();
  if (normalized.includes("cardio")) return "cardiology heart hospital";
  if (normalized.includes("neuro")) return "neurology hospital";
  if (normalized.includes("dermat")) return "dermatology clinic hospital";
  if (normalized.includes("ortho")) return "orthopedic hospital";
  if (normalized.includes("gyne") || normalized.includes("obstetric")) {
    return "women child maternity hospital";
  }
  if (normalized.includes("pediatric")) return "children pediatric hospital";
  if (normalized.includes("dent")) return "dental hospital";
  if (normalized.includes("ent") || normalized.includes("otolaryng")) return "ENT hospital";
  if (normalized.includes("emergency")) return "emergency hospital";
  return `${specialty} hospital`;
}

function inferHospitalType(specialty: string, types: string[]) {
  const normalized = specialty.toLowerCase();
  if (normalized.includes("cardio")) return "Heart hospital";
  if (normalized.includes("neuro")) return "Neurology hospital";
  if (normalized.includes("dent")) return "Dental hospital";
  if (normalized.includes("gyne") || normalized.includes("pediatric")) {
    return "Women and child hospital";
  }
  if (types.includes("hospital")) return "Hospital";
  return "Specialty healthcare facility";
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10;
}
