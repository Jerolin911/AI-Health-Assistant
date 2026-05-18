"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Loader2,
  LocateFixed,
  LogIn,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  UserPlus
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  analyzeSymptoms,
  getApiErrorMessage,
  loginUser,
  registerUser,
  searchHospitals,
  setAuthToken
} from "@/lib/api";
import type {
  Hospital,
  HospitalSearchResponse,
  TriageAnalysis,
  TriageFormValues,
  Urgency
} from "@/lib/types";

type AuthMode = "login" | "register";
type IntakeStep = "story" | "follow-up";
type FollowUpInputType = "radio" | "select";

type FollowUpOption = {
  label: string;
  value: string;
};

type FollowUpQuestion = {
  id: string;
  label: string;
  inputType: FollowUpInputType;
  options: FollowUpOption[];
};

type AnswerMap = Record<string, string>;

const urgencyStyles: Record<Urgency, string> = {
  Mild: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Moderate: "border-amber-200 bg-amber-50 text-amber-800",
  Urgent: "border-orange-200 bg-orange-50 text-orange-800",
  Emergency: "border-red-200 bg-red-50 text-red-800"
};

function isSeriousTriage(analysis: TriageAnalysis) {
  return (
    analysis.shouldCallEmergency ||
    analysis.urgency === "Emergency" ||
    analysis.urgency === "Urgent" ||
    analysis.redFlags.length > 0
  );
}

const commonIntakeQuestions: FollowUpQuestion[] = [
  {
    id: "duration",
    label: "How long has this been happening?",
    inputType: "select",
    options: [
      { label: "Less than 24 hours", value: "less than 1 day" },
      { label: "1 to 2 days", value: "2 days" },
      { label: "3 to 7 days", value: "5 days" },
      { label: "More than a week", value: "more than 1 week" }
    ]
  },
  {
    id: "severity",
    label: "How intense is it right now?",
    inputType: "radio",
    options: [
      { label: "Mild, noticeable but manageable", value: "3" },
      { label: "Moderate, affects normal activity", value: "5" },
      { label: "Severe, hard to function", value: "8" },
      { label: "Very severe or frightening", value: "9" }
    ]
  },
  {
    id: "age",
    label: "Which age group applies?",
    inputType: "select",
    options: [
      { label: "Child or teenager", value: "13" },
      { label: "18 to 39 years", value: "30" },
      { label: "40 to 64 years", value: "50" },
      { label: "65 years or older", value: "70" }
    ]
  }
];

const topicQuestions: Record<string, FollowUpQuestion[]> = {
  chest: [
    {
      id: "chest_activity",
      label: "When does the chest discomfort or breathlessness happen most?",
      inputType: "radio",
      options: [
        { label: "Only with exertion, like stairs", value: "happens with exertion" },
        { label: "Even while resting", value: "happens even at rest" },
        { label: "After meals or lying down", value: "worse after meals or lying down" },
        { label: "Comes and goes without a clear trigger", value: "no clear trigger" }
      ]
    },
    {
      id: "chest_warning",
      label: "Which warning sign is closest?",
      inputType: "select",
      options: [
        { label: "Pain spreads to arm, back, neck, or jaw", value: "pain spreads to arm, back, neck, or jaw" },
        { label: "Sweating, nausea, fainting, or unusual weakness", value: "sweating, nausea, fainting, or unusual weakness" },
        { label: "Breathless, dizzy, or lightheaded", value: "breathless, dizzy, or lightheaded" },
        { label: "None of these", value: "no listed cardiac warning sign" }
      ]
    }
  ],
  respiratory: [
    {
      id: "breathing_level",
      label: "How is your breathing affected?",
      inputType: "radio",
      options: [
        { label: "Normal breathing", value: "breathing is normal" },
        { label: "Breathless only with activity", value: "breathless only with activity" },
        { label: "Breathless while resting", value: "breathless while resting" },
        { label: "Wheezing or chest tightness", value: "wheezing or chest tightness" }
      ]
    },
    {
      id: "fever_pattern",
      label: "What is the fever or infection pattern?",
      inputType: "select",
      options: [
        { label: "No fever", value: "no fever" },
        { label: "Low fever under 3 days", value: "low fever under 3 days" },
        { label: "Fever over 3 days", value: "fever over 3 days" },
        { label: "High fever or chills", value: "high fever or chills" }
      ]
    }
  ],
  neurology: [
    {
      id: "neuro_onset",
      label: "How did the neurological symptom start?",
      inputType: "radio",
      options: [
        { label: "Suddenly", value: "started suddenly" },
        { label: "Gradually", value: "started gradually" },
        { label: "After injury or strain", value: "started after injury or strain" },
        { label: "Not sure", value: "onset unclear" }
      ]
    },
    {
      id: "neuro_warning",
      label: "Any neurological warning sign?",
      inputType: "select",
      options: [
        { label: "One-sided weakness or facial droop", value: "one-sided weakness or facial droop" },
        { label: "Speech, confusion, or vision change", value: "speech, confusion, or vision change" },
        { label: "Seizure or worst-ever headache", value: "seizure or worst-ever headache" },
        { label: "None of these", value: "no listed neurological warning sign" }
      ]
    }
  ],
  skin: [
    {
      id: "skin_spread",
      label: "How is the skin issue changing?",
      inputType: "radio",
      options: [
        { label: "Small and stable", value: "small and stable skin change" },
        { label: "Spreading slowly", value: "spreading slowly" },
        { label: "Spreading quickly", value: "spreading quickly" },
        { label: "Painful, warm, or swollen", value: "painful, warm, or swollen" }
      ]
    },
    {
      id: "skin_trigger",
      label: "What seems linked to it?",
      inputType: "select",
      options: [
        { label: "New food, medicine, or product", value: "possible new food, medicine, or product trigger" },
        { label: "Insect bite or outdoor exposure", value: "possible insect bite or outdoor exposure" },
        { label: "Fever, pus, or infection signs", value: "fever, pus, or infection signs" },
        { label: "No clear trigger", value: "no clear trigger" }
      ]
    }
  ],
  orthopedic: [
    {
      id: "injury_context",
      label: "What happened before the pain started?",
      inputType: "radio",
      options: [
        { label: "Fall, accident, or twist", value: "fall, accident, or twisting injury" },
        { label: "Exercise or lifting strain", value: "exercise or lifting strain" },
        { label: "No injury, started on its own", value: "started without injury" },
        { label: "Not sure", value: "injury context unclear" }
      ]
    },
    {
      id: "movement_limit",
      label: "How much does it limit movement?",
      inputType: "select",
      options: [
        { label: "Can move normally", value: "can move normally" },
        { label: "Painful but possible", value: "movement painful but possible" },
        { label: "Cannot bear weight or use it", value: "cannot bear weight or use the area" },
        { label: "Numbness, deformity, or major swelling", value: "numbness, deformity, or major swelling" }
      ]
    }
  ],
  general: [
    {
      id: "onset",
      label: "How did it begin?",
      inputType: "radio",
      options: [
        { label: "Suddenly", value: "started suddenly" },
        { label: "Gradually", value: "started gradually" },
        { label: "After food, medicine, travel, or exposure", value: "started after food, medicine, travel, or exposure" },
        { label: "Not sure", value: "onset unclear" }
      ]
    },
    {
      id: "trend",
      label: "What is the overall trend?",
      inputType: "select",
      options: [
        { label: "Getting better", value: "getting better" },
        { label: "About the same", value: "about the same" },
        { label: "Getting worse", value: "getting worse" },
        { label: "Comes in episodes", value: "comes in episodes" }
      ]
    }
  ]
};

function generateIntakeQuestions(story: string) {
  const text = story.toLowerCase();
  const inferred = inferStoryContext(text);
  const topic =
    text.includes("chest") || text.includes("breathless") || text.includes("shortness of breath") || text.includes("dizzy")
      ? "chest"
      : text.includes("cough") || text.includes("fever") || text.includes("throat") || text.includes("wheez")
        ? "respiratory"
        : text.includes("headache") || text.includes("migraine") || text.includes("numb") || text.includes("speech") || text.includes("vision")
          ? "neurology"
          : text.includes("rash") || text.includes("itch") || text.includes("skin") || text.includes("swelling")
            ? "skin"
            : text.includes("joint") ||
                text.includes("back") ||
                text.includes("knee") ||
                text.includes("leg") ||
                text.includes("calf") ||
                text.includes("cramp") ||
                text.includes("muscle") ||
                text.includes("swimming") ||
                text.includes("exercise") ||
                text.includes("injury") ||
                text.includes("sprain")
              ? "orthopedic"
              : "general";
  const missingContextQuestions = commonIntakeQuestions.filter((question) => !inferred[question.id]);

  return uniqueQuestions([...topicQuestions[topic], ...missingContextQuestions]).slice(0, 4);
}

function inferStoryContext(text: string): AnswerMap {
  const context: AnswerMap = {};
  const duration = inferDuration(text);
  const severity = inferSeverity(text);
  const age = inferAge(text);

  if (duration) context.duration = duration;
  if (severity) context.severity = severity;
  if (age) context.age = age;

  return context;
}

function inferDuration(text: string) {
  const match = text.match(/\b(\d+)\s*(hour|hours|day|days|week|weeks|month|months)\b/);
  if (match) return `${match[1]} ${match[2]}`;
  if (/\byesterday\b/.test(text)) return "1 day";
  if (/\btoday\b|\bthis morning\b|\btonight\b/.test(text)) return "less than 1 day";
  if (/\bseveral days\b|\bfew days\b/.test(text)) return "several days";
  return "";
}

function inferSeverity(text: string) {
  if (/\b(very severe|unbearable|worst|crushing|cannot function|can't function)\b/.test(text)) return "9";
  if (/\b(severe|intense|very painful|hard to function)\b/.test(text)) return "8";
  if (/\b(moderate|uncomfortable|affects activity|limits activity)\b/.test(text)) return "5";
  if (/\b(mild|slight|minor)\b/.test(text)) return "3";
  return "";
}

function inferAge(text: string) {
  const explicitAge = text.match(/\b(\d{1,3})\s*(?:years old|year old|yo|y\/o)\b/);
  if (explicitAge) return explicitAge[1];
  if (/\b(child|kid|teen|teenager)\b/.test(text)) return "13";
  if (/\b(elderly|senior|older adult)\b/.test(text)) return "70";
  return "";
}

function buildRefinementQuestions(items: string[]) {
  const questions = items.map((item, index) => questionFromText(item, index));
  return uniqueQuestions(questions).slice(0, 4);
}

function questionFromText(label: string, index: number): FollowUpQuestion {
  const text = label.toLowerCase();
  if (text.includes("how old")) {
    return { ...commonIntakeQuestions[2], id: `refine_age_${index}`, label };
  }
  if (text.includes("when") || text.includes("how long") || text.includes("several days")) {
    return { ...commonIntakeQuestions[0], id: `refine_duration_${index}`, label };
  }
  if (text.includes("severe") || text.includes("limit normal activity") || text.includes("worst")) {
    return { ...commonIntakeQuestions[1], id: `refine_severity_${index}`, label };
  }

  return {
    id: `refine_${index}_${normalizeQuestion(label).slice(0, 24)}`,
    label,
    inputType: text.startsWith("which") || text.startsWith("what") || text.startsWith("how")
      ? "select"
      : "radio",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "not sure" },
      { label: "Not applicable", value: "not applicable" }
    ]
  };
}

function uniqueQuestions(questions: FollowUpQuestion[]) {
  const seen = new Set<string>();
  return questions.filter((question) => {
    const key = normalizeQuestion(question.label);
    if (seen.has(question.id) || seen.has(key)) return false;
    seen.add(question.id);
    seen.add(key);
    return true;
  });
}

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function selectedLabel(question: FollowUpQuestion, answers: AnswerMap) {
  const value = answers[question.id];
  return question.options.find((option) => option.value === value)?.label ?? value;
}

function formatQuestionAnswers(questions: FollowUpQuestion[], answers: AnswerMap) {
  return questions
    .filter((question) => answers[question.id])
    .map((question) => `${question.label} ${selectedLabel(question, answers)}`)
    .join(" | ");
}

function makeTriagePayload(
  story: string,
  questions: FollowUpQuestion[],
  answers: AnswerMap
): TriageFormValues {
  const answerSummary = formatQuestionAnswers(questions, answers);
  const inferred = inferStoryContext(story.toLowerCase());
  const duration = answers.duration || inferred.duration || "not specified";
  const severity = Number(answers.severity || inferred.severity || 5);
  const age = Number(answers.age || inferred.age || 30);

  return {
    symptoms: story,
    issueDetails: `User described the issue naturally: ${story}\n\nSmart follow-up answers: ${answerSummary || "No extra details needed before analysis."}`,
    duration,
    severity,
    age,
    medicalHistory: answerSummary
  };
}

export function AssistantWorkspace() {
  const [intakeStep, setIntakeStep] = useState<IntakeStep>("story");
  const [story, setStory] = useState("");
  const [intakeQuestions, setIntakeQuestions] = useState<FollowUpQuestion[]>([]);
  const [intakeAnswers, setIntakeAnswers] = useState<AnswerMap>({});
  const [lastTriageInput, setLastTriageInput] = useState<TriageFormValues | null>(null);
  const [analysis, setAnalysis] = useState<TriageAnalysis | null>(null);
  const [hospitals, setHospitals] = useState<HospitalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hospitalLoading, setHospitalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationCoordinates | undefined>();
  const [locationStatus, setLocationStatus] = useState("Location optional");
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [refinementText, setRefinementText] = useState("");
  const [followUpReplies, setFollowUpReplies] = useState<string[]>([]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("health_token");
    const savedName = window.localStorage.getItem("health_user_name");
    if (savedToken) {
      setToken(savedToken);
      setAuthToken(savedToken);
    }
    if (savedName) setUserName(savedName);
  }, []);

  async function handleLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Location unavailable");
      return;
    }

    setLocationStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
        setLocationStatus("Using current location");
      },
      () => setLocationStatus("Location permission skipped"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function startFollowUps(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Please sign in or create an account before using the healthcare assistant.");
      return;
    }

    const trimmedStory = story.trim();
    if (trimmedStory.length < 12) {
      setError("Start by describing the issue in a short sentence or two.");
      return;
    }

    setError(null);
    setAnalysis(null);
    setHospitals(null);
    setFollowUpReplies([]);
    setRefinementText("");
    setLastTriageInput(null);
    setIntakeQuestions(generateIntakeQuestions(trimmedStory));
    setIntakeAnswers({});
    setIntakeStep("follow-up");
  }

  async function analyzeFromFollowUps(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Please sign in or create an account before using the healthcare assistant.");
      return;
    }

    const missingQuestion = intakeQuestions.find((question) => !intakeAnswers[question.id]);
    if (missingQuestion) {
      setError(`Please answer: ${missingQuestion.label}`);
      return;
    }

    const values = makeTriagePayload(story.trim(), intakeQuestions, intakeAnswers);
    setLoading(true);
    setError(null);
    setHospitals(null);

    try {
      const result = await analyzeSymptoms(values, location);
      setAnalysis(result.analysis);
      setLastTriageInput(values);
      setFollowUpReplies([]);
      setRefinementText("");

      if (isSeriousTriage(result.analysis)) {
        await loadHospitals(result.analysis.recommendedSpecialist);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to analyze symptoms right now"));
    } finally {
      setLoading(false);
    }
  }

  async function submitFollowUpAnswer() {
    if (!analysis || !lastTriageInput) return;
    if (!token) {
      setError("Please sign in again before refining the guidance.");
      return;
    }

    const answer = refinementText.trim();
    if (answer.length < 4) return;

    setLoading(true);
    setError(null);

    const updatedValues: TriageFormValues = {
      ...lastTriageInput,
      issueDetails: `${lastTriageInput.issueDetails}\n\nAdditional follow-up answers from user: ${[
        ...followUpReplies,
        answer
      ].join(" | ")}`
    };

    try {
      const result = await analyzeSymptoms(updatedValues, location);
      setFollowUpReplies((items) => [...items, answer]);
      setRefinementText("");
      setAnalysis(result.analysis);
      setLastTriageInput(updatedValues);

      if (isSeriousTriage(result.analysis)) {
        await loadHospitals(result.analysis.recommendedSpecialist);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to refine the triage result"));
    } finally {
      setLoading(false);
    }
  }

  async function loadHospitals(specialty: string) {
    if (!token) {
      setError("Please sign in before searching nearby hospitals.");
      return;
    }

    if (!location) {
      setError("Please allow current location before searching nearby hospitals.");
      return;
    }

    setHospitalLoading(true);
    try {
      const result = await searchHospitals(specialty, location);
      setHospitals(result);
    } catch (err) {
      setError(getApiErrorMessage(err, "The assistant completed triage, but hospital search failed."));
    } finally {
      setHospitalLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-clinical text-white shadow-panel">
              <HeartPulse aria-hidden className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-ink sm:text-2xl">
                AI-Powered Healthcare Diagnosis Assistant
              </h1>
              <p className="text-sm text-ink/65">
                Triage guidance, specialist routing, and medically relevant hospital search.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLocation}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink shadow-sm transition hover:border-clinical"
            >
              <LocateFixed className="h-4 w-4" aria-hidden />
              {locationStatus}
            </button>
            <AuthPanel
              token={token}
              userName={userName}
              onAuth={(nextToken, nextName) => {
                setToken(nextToken);
                setUserName(nextName);
                setAuthToken(nextToken);
                window.localStorage.setItem("health_token", nextToken);
                window.localStorage.setItem("health_user_name", nextName);
              }}
              onLogout={() => {
                setToken(null);
                setUserName(null);
                setIntakeStep("story");
                setStory("");
                setIntakeQuestions([]);
                setIntakeAnswers({});
                setLastTriageInput(null);
                setAnalysis(null);
                setHospitals(null);
                setFollowUpReplies([]);
                setRefinementText("");
                setAuthToken(null);
                window.localStorage.removeItem("health_token");
                window.localStorage.removeItem("health_user_name");
              }}
            />
          </div>
        </header>

        {!token && (
          <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold">Sign in required</h2>
                <p className="mt-1 text-sm leading-6">
                  Create an account or login before using symptom triage, follow-up refinement, or nearby hospital search.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
          <form
            onSubmit={intakeStep === "story" ? startFollowUps : analyzeFromFollowUps}
            className="h-fit rounded-md border border-ink/10 bg-white p-4 shadow-panel"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink">Clinical Intake</h2>
                <p className="text-sm text-ink/60">
                  {intakeStep === "story"
                    ? "Start with a natural description, then answer focused follow-ups."
                    : "Answer only the details that affect urgency and routing."}
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-clinical" aria-hidden />
            </div>

            <div className="space-y-4">
              {intakeStep === "story" ? (
                <Field label="Tell the issue as a short story">
                  <textarea
                    value={story}
                    onChange={(event) => setStory(event.target.value)}
                    rows={6}
                    className="input"
                    placeholder="I've had chest discomfort for 2 days while climbing stairs and feel breathless and dizzy."
                  />
                </Field>
              ) : (
                <>
                  <div className="rounded-md border border-ink/10 bg-mist p-3 text-sm leading-6 text-ink/75">
                    {story}
                  </div>
                  <div className="space-y-3">
                    {intakeQuestions.map((question) => (
                      <FollowUpQuestionControl
                        key={question.id}
                        question={question}
                        value={intakeAnswers[question.id] ?? ""}
                        onChange={(value) =>
                          setIntakeAnswers((answers) => ({ ...answers, [question.id]: value }))
                        }
                      />
                    ))}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-clinical px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#145f54] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : intakeStep === "story" ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {!token ? "Sign in to continue" : intakeStep === "story" ? "Ask follow-up questions" : "Analyze with answers"}
              </button>
              {intakeStep === "follow-up" && (
                <button
                  type="button"
                  onClick={() => {
                    setIntakeStep("story");
                    setAnalysis(null);
                    setHospitals(null);
                    setError(null);
                  }}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-semibold text-ink transition hover:border-clinical"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Edit story
                </button>
              )}
            </div>
          </form>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]">
            <section className="rounded-md border border-ink/10 bg-white shadow-panel">
              <div className="border-b border-ink/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">Assistant Flow</h2>
                    <p className="text-sm text-ink/60">Guided clinical pre-diagnosis support.</p>
                  </div>
                  <Activity className="h-5 w-5 text-clinical" aria-hidden />
                </div>
              </div>

              <div className="scrollbar-thin max-h-[720px] space-y-4 overflow-auto p-4">
                <ChatBubble role="assistant">
                  Tell me what happened in your own words first. I will ask focused follow-up questions before giving triage guidance.
                </ChatBubble>

                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {story.trim().length > 0 && (
                  <ChatBubble role="user">
                    {story}
                  </ChatBubble>
                )}

                {intakeStep === "follow-up" && !analysis && (
                  <ChatBubble role="assistant">
                    I found the most relevant follow-up areas from your story. Choose the closest answer for each one so I can avoid repeating broad symptom questions.
                  </ChatBubble>
                )}

                {followUpReplies.map((reply, index) => (
                  <ChatBubble key={`${reply}-${index}`} role="user">
                    {reply}
                  </ChatBubble>
                ))}

                {analysis ? (
                  <AnalysisPanel
                    analysis={analysis}
                    refinementText={refinementText}
                    loading={loading}
                    onRefinementTextChange={setRefinementText}
                    onSubmitFollowUpAnswer={submitFollowUpAnswer}
                  />
                ) : (
                  <EmptyClinicalState />
                )}
              </div>
            </section>

            <section className="rounded-md border border-ink/10 bg-white shadow-panel">
              <div className="border-b border-ink/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">Relevant Hospitals</h2>
                    <p className="text-sm text-ink/60">
                      {analysis?.recommendedSpecialist ?? "Specialty-based results appear after triage."}
                    </p>
                  </div>
                  <Building2 className="h-5 w-5 text-clinical" aria-hidden />
                </div>
              </div>
              <HospitalPanel
                analysis={analysis}
                hospitals={hospitals}
                loading={hospitalLoading}
                onSearch={() => analysis && loadHospitals(analysis.recommendedSpecialist)}
              />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

function ChatBubble({
  role,
  children
}: {
  role: "assistant" | "user";
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-md px-4 py-3 text-sm leading-6 ${
          role === "user" ? "bg-clinical text-white" : "bg-mist text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function EmptyClinicalState() {
  return (
    <div className="grid min-h-[420px] place-items-center rounded-md border border-dashed border-ink/15 bg-[#fbfcfa] p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md bg-mist text-clinical">
          <Stethoscope className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-ink">Ready for your story</h3>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Describe the issue naturally first. The assistant will ask focused follow-up questions before triage guidance, urgency, and specialist routing.
        </p>
      </div>
    </div>
  );
}

function FollowUpQuestionControl({
  question,
  value,
  onChange
}: {
  question: FollowUpQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.inputType === "select") {
    return (
      <Field label={question.label}>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="input"
        >
          <option value="">Choose the closest answer</option>
          {question.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-ink">{question.label}</legend>
      <div className="grid gap-2">
        {question.options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm leading-5 transition ${
              value === option.value
                ? "border-clinical bg-mist text-clinical"
                : "border-ink/10 bg-white text-ink/75 hover:border-clinical/50"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 accent-clinical"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AnalysisPanel({
  analysis,
  refinementText,
  loading,
  onRefinementTextChange,
  onSubmitFollowUpAnswer
}: {
  analysis: TriageAnalysis;
  refinementText: string;
  loading: boolean;
  onRefinementTextChange: (value: string) => void;
  onSubmitFollowUpAnswer: () => void;
}) {
  return (
    <div className="space-y-4">
      <ChatBubble role="assistant">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${urgencyStyles[analysis.urgency]}`}>
              {analysis.urgency}
            </span>
            <span className="rounded-md border border-ink/10 bg-white px-2.5 py-1 text-xs font-semibold text-ink">
              {analysis.recommendedSpecialist}
            </span>
          </div>
          <p>{analysis.explanation}</p>
        </div>
      </ChatBubble>

      {analysis.shouldCallEmergency && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-5 w-5" aria-hidden />
            Emergency care recommended now
          </div>
          <p className="text-sm leading-6">
            These symptoms include red flags. Call local emergency services or go to the nearest emergency department.
          </p>
        </div>
      )}

      <InfoBlock title="Possible Issues" icon={<Sparkles className="h-4 w-4" />}>
        <PillList items={analysis.possibleIssues} />
      </InfoBlock>

      <InfoBlock title="Guided Suggestions" icon={<ClipboardList className="h-4 w-4" />}>
        <NumberedList items={analysis.suggestions} />
      </InfoBlock>

      <InfoBlock title="Follow-Up Questions" icon={<ChevronRight className="h-4 w-4" />}>
        <div className="mt-4 rounded-md border border-ink/10 bg-[#fbfcfa] p-3">
          <NumberedList items={analysis.followUpQuestions} />
          <label className="mt-4 block text-sm font-semibold text-ink" htmlFor="refinement-answer">
            Answer the relevant questions in your own words
          </label>
          <textarea
            id="refinement-answer"
            value={refinementText}
            onChange={(event) => onRefinementTextChange(event.target.value)}
            rows={4}
            className="input mt-2"
            placeholder="Example: It is mostly in my calf, started after swimming, no swelling, pain is moderate, and I can walk."
          />
          <button
            type="button"
            onClick={onSubmitFollowUpAnswer}
            disabled={loading || refinementText.trim().length < 4}
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-clinical px-3 text-sm font-semibold text-white transition hover:bg-[#145f54] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Refine guidance
          </button>
        </div>
      </InfoBlock>

      <InfoBlock title="Specialist Reason" icon={<Stethoscope className="h-4 w-4" />}>
        <p className="text-sm leading-6 text-ink/75">{analysis.specialistReason}</p>
      </InfoBlock>

      {analysis.redFlags.length > 0 && (
        <InfoBlock title="Red Flags" icon={<AlertTriangle className="h-4 w-4" />}>
          <PillList items={analysis.redFlags} tone="red" />
        </InfoBlock>
      )}

      <p className="rounded-md bg-[#f5f3ee] p-3 text-xs leading-5 text-ink/65">
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  icon,
  children
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="text-clinical">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function PillList({ items, tone = "green" }: { items: string[]; tone?: "green" | "red" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
            tone === "red"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-clinical/20 bg-mist text-clinical"
          }`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-ink/75">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-mist text-xs font-semibold text-clinical">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function HospitalPanel({
  analysis,
  hospitals,
  loading,
  onSearch
}: {
  analysis: TriageAnalysis | null;
  hospitals: HospitalSearchResponse | null;
  loading: boolean;
  onSearch: () => void;
}) {
  const selected = hospitals?.hospitals[0] ?? null;
  const alternatives = hospitals?.hospitals.slice(1) ?? [];
  const mapUrl = useMemo(() => {
    if (!selected?.mapLocation) return null;
    return `https://www.google.com/maps?q=${selected.mapLocation.latitude},${selected.mapLocation.longitude}&z=13&output=embed`;
  }, [selected]);

  if (!analysis) {
    return (
      <div className="grid min-h-[620px] place-items-center p-5 text-center">
        <div className="max-w-xs">
          <MapPin className="mx-auto mb-4 h-10 w-10 text-clinical" aria-hidden />
          <h3 className="font-semibold text-ink">No specialty selected</h3>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Hospital search starts from the assistant's specialist recommendation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-md border border-ink/10 bg-mist p-3">
        <p className="text-xs font-semibold uppercase text-clinical">Recommended specialist</p>
        <p className="mt-1 text-sm font-semibold text-ink">{analysis.recommendedSpecialist}</p>
        <p className="mt-2 text-xs leading-5 text-ink/65">
          Hospital recommendations are shown for serious triage results or when you request them.
        </p>
      </div>

      <button
        type="button"
        onClick={onSearch}
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-clinical bg-white px-3 text-sm font-semibold text-clinical transition hover:bg-mist disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
        Find {analysis.recommendedSpecialist} care
      </button>

      {mapUrl && (
        <iframe
          title="Hospital map"
          src={mapUrl}
          className="h-56 w-full rounded-md border border-ink/10"
          loading="lazy"
        />
      )}

      <div className="space-y-3">
        {loading && <p className="text-sm text-ink/60">Searching relevant hospitals...</p>}
        {!loading && hospitals && hospitals.hospitals.length === 0 && (
          <p className="rounded-md border border-ink/10 bg-white p-3 text-sm text-ink/65">
            No medically relevant nearby hospitals were returned for this specialist search.
          </p>
        )}
        {selected && (
          <HospitalCard hospital={selected} label="Primary recommendation" />
        )}
        {alternatives.length > 0 && (
          <div className="pt-1">
            <p className="mb-2 text-xs font-semibold uppercase text-ink/55">Nearby alternatives</p>
            <div className="space-y-3">
              {alternatives.map((hospital) => (
                <HospitalCard key={hospital.id} hospital={hospital} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HospitalCard({ hospital, label }: { hospital: Hospital; label?: string }) {
  return (
    <article className="rounded-md border border-ink/10 bg-white p-3">
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase text-clinical">{label}</p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{hospital.name}</h3>
          <p className="mt-1 text-xs font-medium text-clinical">{hospital.hospitalType}</p>
        </div>
        {hospital.rating && (
          <span className="rounded-md bg-[#f5f3ee] px-2 py-1 text-xs font-semibold text-ink">
            {hospital.rating.toFixed(1)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-5 text-ink/65">{hospital.address}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink/70">
        {hospital.distanceKm !== null && <span>{hospital.distanceKm} km away</span>}
        {hospital.contactNumber && <span>{hospital.contactNumber}</span>}
        {hospital.source === "development_fallback" && <span>Development data</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={hospital.directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-clinical px-3 text-xs font-semibold text-white"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Directions
        </a>
        {hospital.website && (
          <a
            href={hospital.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-ink/15 px-3 text-xs font-semibold text-ink"
          >
            Website
          </a>
        )}
      </div>
    </article>
  );
}

function AuthPanel({
  token,
  userName,
  onAuth,
  onLogout
}: {
  token: string | null;
  userName: string | null;
  onAuth: (token: string, userName: string) => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<{
    name: string;
    email: string;
    password: string;
  }>();

  if (token) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink">
          {userName ?? "Signed in"}
        </span>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function submit(values: { name: string; email: string; password: string }) {
    setBusy(true);
    setMessage(null);
    try {
      const result =
        mode === "register"
          ? await registerUser(values)
          : await loginUser({ email: values.email, password: values.password });
      onAuth(result.token, result.user.name);
      reset();
      setOpen(false);
    } catch (error) {
      setMessage(getApiErrorMessage(error, "Authentication failed. Check your details and try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-medium text-ink shadow-sm"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        Sign in
      </button>

      {open && (
        <form
          onSubmit={handleSubmit(submit)}
          className="absolute right-0 z-20 mt-2 w-[min(360px,calc(100vw-2rem))] rounded-md border border-ink/10 bg-white p-4 shadow-panel"
        >
          <div className="mb-3 flex rounded-md bg-mist p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`h-9 flex-1 rounded-md text-sm font-semibold ${mode === "login" ? "bg-white text-clinical shadow-sm" : "text-ink/60"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`h-9 flex-1 rounded-md text-sm font-semibold ${mode === "register" ? "bg-white text-clinical shadow-sm" : "text-ink/60"}`}
            >
              Register
            </button>
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <input
                {...register("name", { required: mode === "register" })}
                className="input"
                placeholder="Name"
              />
            )}
            <input
              {...register("email", { required: true })}
              className="input"
              placeholder="Email"
              type="email"
            />
            <input
              {...register("password", { required: true, minLength: 8 })}
              className="input"
              placeholder="Password"
              type="password"
            />
            {message && <p className="text-xs text-red-700">{message}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-clinical text-sm font-semibold text-white disabled:opacity-70"
            >
              {mode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {busy ? "Please wait" : mode === "register" ? "Create account" : "Login"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
