from dataclasses import dataclass
from re import search

from .models import TriageRequest, TriageResponse


DISCLAIMER = (
    "This is first-level triage guidance, not a diagnosis. If symptoms are severe, "
    "worsening, unusual for you, or you feel unsafe, seek medical care promptly."
)


@dataclass(frozen=True)
class ConditionRule:
    name: str
    keywords: tuple[str, ...]
    possible_issues: tuple[str, ...]
    specialist: str
    specialist_reason: str
    suggestions: tuple[str, ...]
    follow_ups: tuple[str, ...]


RULES = (
    ConditionRule(
        name="cardiac_or_chest",
        keywords=("chest pain", "chest tightness", "breathing difficulty", "shortness of breath", "dizziness", "sweating", "left arm", "jaw pain"),
        possible_issues=("Acid reflux", "Muscle strain", "Anxiety-related chest discomfort", "Cardiac concern"),
        specialist="Cardiologist",
        specialist_reason="Chest discomfort with breathing difficulty, dizziness, sweating, or radiating pain needs cardiac risk review.",
        suggestions=(
            "Stop strenuous activity and sit upright in a calm, well-ventilated place.",
            "Avoid heavy meals, alcohol, smoking, and exertion until the symptoms are clearer.",
            "Note when the pain started, what triggered it, whether it spreads, and whether breathing changes it.",
            "If chest pain is severe, persistent, or paired with breathing difficulty, sweating, fainting, or arm or jaw pain, seek emergency care immediately."
        ),
        follow_ups=(
            "Is the chest pain severe, crushing, or spreading to the arm, back, neck, or jaw?",
            "Is there breathing difficulty during normal activity or while resting?",
            "Are you sweating, faint, dizzy, nauseated, or unusually weak?"
        ),
    ),
    ConditionRule(
        name="neurology",
        keywords=("headache", "migraine", "weakness", "numbness", "confusion", "speech", "vision loss", "seizure", "facial droop"),
        possible_issues=("Migraine", "Nerve irritation", "Vestibular issue", "Stroke-like neurological concern"),
        specialist="Neurologist",
        specialist_reason="Sudden weakness, numbness, speech changes, seizures, severe headache, or vision symptoms require neurological evaluation.",
        suggestions=(
            "Rest in a quiet place and avoid driving if there is dizziness, confusion, vision change, or weakness.",
            "Hydrate gradually and track headache intensity, location, triggers, and associated symptoms.",
            "Avoid alcohol and sedating medicines unless prescribed.",
            "Sudden one-sided weakness, facial droop, speech trouble, seizure, or worst-ever headache should be treated as an emergency."
        ),
        follow_ups=(
            "Did the symptoms start suddenly?",
            "Is there one-sided weakness, facial drooping, speech difficulty, confusion, or vision loss?",
            "Is this the worst headache you have ever experienced?"
        ),
    ),
    ConditionRule(
        name="respiratory_ent",
        keywords=("cough", "sore throat", "ear pain", "sinus", "blocked nose", "wheezing", "breathless", "fever"),
        possible_issues=("Viral upper respiratory infection", "Sinus or throat infection", "Allergy flare", "Asthma or lower respiratory concern"),
        specialist="ENT Specialist",
        specialist_reason="Persistent throat, ear, sinus, or breathing-related symptoms may need ENT review; severe breathlessness needs urgent care.",
        suggestions=(
            "Drink fluids, rest, and use steam or saline rinses if congestion is present.",
            "Avoid smoke, dust, cold air exposure, and strenuous activity while breathless.",
            "Monitor temperature, breathing effort, oxygen saturation if available, and symptom duration.",
            "Seek care urgently for high fever, chest tightness, bluish lips, confusion, or breathing difficulty at rest."
        ),
        follow_ups=(
            "Has fever continued for more than three days or gone above 103 F or 39.4 C?",
            "Is there wheezing or breathlessness while resting?",
            "Is there ear discharge, severe throat swelling, or trouble swallowing?"
        ),
    ),
    ConditionRule(
        name="skin",
        keywords=("rash", "itching", "hives", "skin", "acne", "swelling", "burning", "blister"),
        possible_issues=("Allergic rash", "Dermatitis", "Skin infection", "Inflammatory skin condition"),
        specialist="Dermatologist",
        specialist_reason="Spreading rash, swelling, infection signs, or persistent skin changes are best reviewed by dermatology.",
        suggestions=(
            "Avoid scratching and pause new cosmetics, fragrances, or suspected triggers.",
            "Keep the area clean and dry; use a cool compress for irritation.",
            "Do not apply steroid, antibiotic, or strong medicated creams unless advised by a clinician.",
            "Seek urgent care if rash comes with facial swelling, breathing difficulty, fever, pus, severe pain, or rapid spread."
        ),
        follow_ups=(
            "Is the rash spreading quickly or becoming painful?",
            "Is there fever, pus, warmth, or swelling around the skin area?",
            "Did swelling of lips, tongue, throat, or breathing difficulty occur?"
        ),
    ),
    ConditionRule(
        name="orthopedic",
        keywords=("joint pain", "back pain", "knee", "shoulder", "fracture", "sprain", "swelling", "injury", "bone", "leg", "calf", "cramp", "muscle", "swimming", "exercise", "strain"),
        possible_issues=("Exercise-related muscle cramp", "Muscle strain or overuse", "Dehydration or electrolyte-related cramping", "Joint, tendon, or nerve irritation"),
        specialist="Orthopedic",
        specialist_reason="Persistent cramps, exercise-related muscle pain, swelling, limited movement, deformity, or ongoing bone and joint pain should be assessed by orthopedics or sports medicine.",
        suggestions=(
            "Pause intense activity and avoid repeating the movement that triggered the cramp until symptoms settle.",
            "Hydrate and consider normal dietary electrolyte sources if sweating, prolonged exercise, or heat exposure was involved.",
            "Use gentle stretching only if it eases the cramp; avoid forceful stretching after injury, severe pain, swelling, or numbness.",
            "Use cold packs for new strain-like pain and elevate the limb if there is swelling.",
            "Seek urgent care if there is deformity, inability to bear weight, numbness, severe swelling, redness with warmth, or suspected fracture."
        ),
        follow_ups=(
            "Is the cramp in the calf, thigh, foot, or around a joint?",
            "Did it start during or after exercise, swimming, heat exposure, or heavy sweating?",
            "Can you bear weight and move the leg normally?",
            "Is there swelling, redness, warmth, numbness, deformity, or worsening pain?"
        ),
    ),
    ConditionRule(
        name="dental",
        keywords=("tooth", "gum", "dental", "jaw swelling", "cavity", "mouth pain"),
        possible_issues=("Dental cavity", "Gum infection", "Tooth abscess", "Jaw-related dental concern"),
        specialist="Dentist",
        specialist_reason="Tooth pain, gum swelling, jaw swelling, or suspected dental infection needs dental evaluation.",
        suggestions=(
            "Rinse gently with warm salt water and avoid chewing on the painful side.",
            "Avoid very hot, cold, or sugary foods if they trigger pain.",
            "Do not place aspirin or harsh chemicals directly on gums or teeth.",
            "Seek urgent dental care for facial swelling, fever, difficulty opening the mouth, or trouble swallowing."
        ),
        follow_ups=(
            "Is there swelling in the jaw, face, or gums?",
            "Is there fever, pus, bad taste, or difficulty opening your mouth?",
            "Does pain worsen when biting or with hot or cold foods?"
        ),
    ),
    ConditionRule(
        name="gynecology",
        keywords=("pregnant", "pregnancy", "period", "pelvic", "vaginal", "menstrual", "gynec", "bleeding"),
        possible_issues=("Menstrual cramping", "Urinary or pelvic infection", "Hormonal cycle-related symptoms", "Pregnancy-related concern"),
        specialist="Gynecologist",
        specialist_reason="Pelvic pain, pregnancy-related symptoms, abnormal bleeding, or gynecological concerns should be reviewed by a gynecologist.",
        suggestions=(
            "Track bleeding amount, pain severity, cycle timing, and pregnancy possibility.",
            "Stay hydrated and rest if pain is mild and familiar.",
            "Avoid self-medicating during pregnancy or suspected pregnancy unless a clinician has advised it.",
            "Seek urgent care for heavy bleeding, severe pelvic pain, fainting, shoulder-tip pain, fever, or pregnancy with pain or bleeding."
        ),
        follow_ups=(
            "Is there heavy bleeding, fainting, severe pelvic pain, or possible pregnancy?",
            "Has the pain or bleeding pattern changed from what is normal for you?",
            "Is there fever, unusual discharge, or burning urination?"
        ),
    ),
    ConditionRule(
        name="pediatrics",
        keywords=("child", "infant", "baby", "toddler", "pediatric"),
        possible_issues=("Common childhood infection", "Dehydration risk", "Respiratory or fever-related pediatric concern"),
        specialist="Pediatrician",
        specialist_reason="Children, infants, and toddlers need age-specific assessment, especially with fever, dehydration, or breathing changes.",
        suggestions=(
            "Monitor temperature, activity level, breathing effort, feeding, and urination.",
            "Offer fluids frequently if age-appropriate and avoid over-bundling during fever.",
            "Do not give adult medicines or aspirin to children unless prescribed.",
            "Seek urgent care for breathing difficulty, blue lips, lethargy, seizure, dehydration signs, stiff neck, or fever in a very young infant."
        ),
        follow_ups=(
            "How old is the child, and are they feeding or drinking normally?",
            "Are there fewer wet diapers or signs of dehydration?",
            "Is there fast breathing, chest pulling, unusual sleepiness, seizure, or persistent high fever?"
        ),
    ),
)


EMERGENCY_PATTERNS = (
    ("chest pain with breathing difficulty or dizziness", ("chest pain", "breathing difficulty", "dizziness")),
    ("possible stroke symptoms", ("facial droop", "one-sided weakness", "speech difficulty")),
    ("severe breathing difficulty", ("severe breathing",)),
    ("loss of consciousness or fainting", ("loss of consciousness", "fainting")),
    ("seizure", ("seizure",)),
    ("heavy bleeding", ("heavy bleeding",)),
    ("severe allergic reaction", ("throat swelling", "tongue swelling", "lip swelling", "anaphylaxis")),
    ("self-harm emergency", ("suicidal", "self harm", "kill myself")),
)


def analyze_triage(request: TriageRequest) -> TriageResponse:
    text = normalize(" ".join([
        request.symptoms,
        request.issueDetails,
        request.duration,
        request.medicalHistory or "",
    ]))
    matched_rules = match_rules(text)
    primary_rule = matched_rules[0] if matched_rules else generic_rule()
    red_flags = detect_red_flags(text, request)
    urgency = classify_urgency(text, request, red_flags)
    possible_issues = merge_possible_issues(matched_rules or [primary_rule])
    suggestions = build_suggestions(primary_rule, urgency, red_flags)
    follow_ups = build_follow_ups(primary_rule, urgency)
    needs_medical_attention = urgency in ("Moderate", "Urgent", "Emergency") or bool(red_flags)
    should_call_emergency = urgency == "Emergency"

    return TriageResponse(
        possibleIssues=possible_issues,
        urgency=urgency,
        redFlags=red_flags,
        explanation=build_explanation(primary_rule, possible_issues, urgency, request),
        suggestions=suggestions,
        followUpQuestions=follow_ups,
        recommendedSpecialist=primary_rule.specialist if urgency != "Emergency" else emergency_specialist(primary_rule),
        specialistReason=primary_rule.specialist_reason,
        needsMedicalAttention=needs_medical_attention,
        shouldCallEmergency=should_call_emergency,
        searchQuery=build_search_query(primary_rule.specialist if urgency != "Emergency" else emergency_specialist(primary_rule)),
        disclaimer=DISCLAIMER,
    )


def normalize(value: str) -> str:
    return value.lower().replace("-", " ")


def match_rules(text: str) -> list[ConditionRule]:
    scored: list[tuple[int, ConditionRule]] = []
    for rule in RULES:
        score = sum(1 for keyword in rule.keywords if keyword in text)
        if score:
            scored.append((score, rule))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [rule for _, rule in scored]


def detect_red_flags(text: str, request: TriageRequest) -> list[str]:
    flags: list[str] = []
    for label, patterns in EMERGENCY_PATTERNS:
        if any(pattern in text for pattern in patterns):
            flags.append(label)

    if "chest pain" in text and any(item in text for item in ("breathing difficulty", "shortness of breath", "dizziness", "sweating", "faint")):
        flags.append("chest pain paired with a cardiac warning sign")
    if request.severity >= 9:
        flags.append("very severe symptom intensity")
    if request.age >= 65 and request.severity >= 7:
        flags.append("higher-risk age with significant symptom intensity")
    if duration_is_persistent(request.duration) and request.severity >= 6:
        flags.append("persistent symptoms with moderate to severe intensity")

    return unique(flags)


def classify_urgency(text: str, request: TriageRequest, red_flags: list[str]) -> str:
    if red_flags:
        return "Emergency" if emergency_language(text, red_flags) or request.severity >= 9 else "Urgent"
    if request.severity >= 8:
        return "Urgent"
    if request.severity >= 5 or duration_is_persistent(request.duration):
        return "Moderate"
    return "Mild"


def emergency_language(text: str, red_flags: list[str]) -> bool:
    critical_terms = ("stroke", "severe breathing", "loss of consciousness", "seizure", "heavy bleeding", "suicidal", "self harm")
    return any(term in text for term in critical_terms) or any("cardiac warning" in flag for flag in red_flags)


def duration_is_persistent(duration: str) -> bool:
    value = duration.lower()
    if any(token in value for token in ("week", "month", "year")):
        return True
    match = search(r"(\d+)", value)
    if not match:
        return any(token in value for token in ("several days", "many days", "long time"))
    days = int(match.group(1))
    return "day" in value and days >= 3


def build_suggestions(rule: ConditionRule, urgency: str, red_flags: list[str]) -> list[str]:
    suggestions = list(rule.suggestions)
    if urgency == "Emergency":
        suggestions.insert(0, "Treat this as potentially serious. Call local emergency services or go to the nearest emergency department now.")
        suggestions.insert(1, "Do not drive yourself if you feel faint, breathless, confused, weak, or have severe pain.")
    elif urgency == "Urgent":
        suggestions.insert(0, "Arrange same-day medical care, especially if symptoms are worsening or unusual for you.")
    elif urgency == "Moderate":
        suggestions.insert(0, "Book a medical consultation if symptoms persist, worsen, or interfere with normal activity.")
    else:
        suggestions.insert(0, "Monitor symptoms closely over the next 24 to 48 hours and escalate if they worsen or new warning signs appear.")

    if red_flags:
        suggestions.append("Red flags detected: " + "; ".join(red_flags) + ".")
    return unique(suggestions)


def build_follow_ups(rule: ConditionRule, urgency: str) -> list[str]:
    common = [
        "Has this issue been happening for several days?",
        "Are symptoms becoming worse or more frequent?",
        "Is pain or discomfort severe enough to limit normal activity?",
        "Is there fever, bleeding, swelling, sudden discomfort, or breathing difficulty?"
    ]
    if urgency in ("Urgent", "Emergency"):
        common.insert(0, "Are you currently safe, awake, and able to breathe comfortably?")
    return unique(list(rule.follow_ups) + common)


def build_explanation(rule: ConditionRule, possible_issues: list[str], urgency: str, request: TriageRequest) -> str:
    issue_text = ", ".join(possible_issues[:-1]) + (f", or {possible_issues[-1]}" if len(possible_issues) > 1 else possible_issues[0])
    return (
        f"Based on the symptom pattern, duration, severity score of {request.severity}/10, and age, "
        f"this may fit {issue_text}. The current triage level is {urgency}. "
        f"This result is meant to guide the next safe step, not confirm a disease."
    )


def merge_possible_issues(rules: list[ConditionRule]) -> list[str]:
    issues: list[str] = []
    for rule in rules[:2]:
        issues.extend(rule.possible_issues)
    return unique(issues)[:6]


def emergency_specialist(rule: ConditionRule) -> str:
    if rule.specialist in ("Cardiologist", "Neurologist"):
        return f"Emergency Medicine and {rule.specialist}"
    return "Emergency Medicine"


def build_search_query(specialist: str) -> str:
    value = specialist.lower()
    if "cardio" in value:
        return "cardiology hospitals near me"
    if "neuro" in value:
        return "neurology hospitals near me"
    if "emergency" in value:
        return "emergency hospitals near me"
    if "gynec" in value or "pediatric" in value:
        return "women and child hospitals near me"
    if "dent" in value:
        return "dental hospitals near me"
    if "ent" in value:
        return "ENT hospitals near me"
    return f"{specialist} hospitals near me"


def generic_rule() -> ConditionRule:
    return ConditionRule(
        name="general",
        keywords=(),
        possible_issues=("Minor self-limited illness", "Infection or inflammation", "Condition needing clinical review"),
        specialist="General Physician",
        specialist_reason="The symptoms are not specific enough for a single specialty, so primary care is the safest first step.",
        suggestions=(
            "Rest, hydrate, and keep a written timeline of symptoms, triggers, and severity changes.",
            "Avoid self-medicating with antibiotics, steroids, or strong pain medicines without medical advice.",
            "Monitor temperature, pain level, breathing, appetite, sleep, and ability to do normal activities.",
            "Seek care if symptoms persist, worsen, recur, or feel unusual for you."
        ),
        follow_ups=(
            "Which symptom is most worrying right now?",
            "When did it start, and was the onset sudden or gradual?",
            "Have you had similar symptoms before?"
        ),
    )


def unique(values: list[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result
