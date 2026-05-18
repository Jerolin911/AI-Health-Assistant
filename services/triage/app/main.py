from flask import Flask, jsonify, request
from flask_cors import CORS

from .engine import analyze_triage
from .models import TriageRequest


app = Flask(__name__)
CORS(app)


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "healthcare-triage-service"})


@app.post("/analyze")
def analyze():
    try:
        triage_request = TriageRequest.from_payload(request.get_json(silent=True) or {})
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    return jsonify(analyze_triage(triage_request).to_dict())
