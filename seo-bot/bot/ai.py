"""Gemini for the SEO bot: diagnosis and writing, always as JSON.

Uses the free-tier key in /var/lib/n8n/secrets/gemini-api-key (project aorbo-seo-bot,
restricted to the Gemini API). Facts must come from our own data, which the caller
passes in; the system instruction forbids inventing numbers, prices or claims.
"""
import json
import time
import urllib.error
import urllib.request

from common import secret

# Best first; when a model is overloaded (503) or slow, the next one is tried.
MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]
RULES = (
    "You write for aorbotreks.com, an Indian trek booking platform (brand name AORBO Treks). "
    "Use ONLY facts given in the input. Never invent prices, dates, numbers, reviews, awards or claims "
    "(no 'best', 'No.1', 'certified', '24/7', 'guaranteed'). Say 'slot', never 'seat'. "
    "Plain, helpful English for Indian trekkers. No keyword stuffing. Answer with JSON only."
)


def generate_json(prompt, schema=None, temperature=0.4, retries=3):
    """Returns the parsed JSON object Gemini produced."""
    config = {"temperature": temperature, "responseMimeType": "application/json"}
    if schema:
        config["responseSchema"] = schema
    body = json.dumps({"systemInstruction": {"parts": [{"text": RULES}]},
                       "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                       "generationConfig": config}).encode("utf-8")
    errors = []
    for attempt in range(retries):
        for model in MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={secret('gemini-api-key')}"
            try:
                req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
                data = json.load(urllib.request.urlopen(req, timeout=60))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            except urllib.error.HTTPError as e:
                errors.append(f"{model}: HTTP {e.code}")
                if e.code not in (429, 500, 503, 504):
                    raise RuntimeError(f"Gemini {model} HTTP {e.code}: {e.read().decode()[:300]}") from e
            except (TimeoutError, OSError) as e:  # slow or dropped: try the next model
                errors.append(f"{model}: {e.__class__.__name__}")
        time.sleep(20 * (attempt + 1))  # all busy (free-tier limits): wait, then try again
    raise RuntimeError("Gemini: no answer (" + "; ".join(errors[-4:]) + ")")


if __name__ == "__main__":
    out = generate_json(
        "Trek data: name 'Kedarkantha Trek', state 'Himachal Pradesh', from price INR 15000, "
        "durations 3D/2N, 4D/3N, 5D/4N, departs THU FRI SAT. Write an SEO title (max 60 chars) and "
        "meta description (max 155 chars) for its booking page.",
        schema={"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}},
                "required": ["title", "description"]})
    print(json.dumps(out, indent=1, ensure_ascii=False), len(out["title"]), len(out["description"]))
