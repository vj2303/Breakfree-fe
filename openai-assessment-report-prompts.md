# Assessment Report Prompt Pack — OpenAI Edition

A production prompt set for generating Breakfree-style assessment reports using the **OpenAI API**. Designed to be called from your backend service.

The prompts themselves are model-agnostic, but the integration patterns differ between OpenAI and Anthropic. This pack uses the patterns that work best with OpenAI:

- **Structured Outputs** (`response_format` with JSON Schema) — replaces the validation-and-retry loop with guaranteed schema-conformant output
- **System message via `messages[0]`** — same pattern as before, but the role is `"system"` not the Anthropic top-level `system` parameter
- **Model recommendations** calibrated for the OpenAI catalogue
- **Retry logic** that handles OpenAI-specific failure modes (refusals, content policy, length cutoffs)

---

## Architecture — Three Calls, Not One

(Same architecture rationale as the Anthropic version. Splitting into three calls produces materially better output than one monolithic call.)

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT: BARS scores + raw assessor evidence per sub-competency  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ CALL 1:          │ │ CALL 2:          │ │ CALL 3:          │
│ Competency Prose │ │ AI Insights      │ │ 70-20-10 Recs    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ RENDERER         │
                    │ (your code)      │
                    └──────────────────┘
```

Cover, intro, summary, and BARS reference pages need no LLM — your renderer builds them directly from the score table.

---

## Why Use Structured Outputs (Not Just JSON Mode)

OpenAI offers two ways to get JSON back:

| Approach | What it guarantees |
|---|---|
| `response_format: { "type": "json_object" }` (JSON mode) | Output is valid JSON, but may not match your schema |
| `response_format: { "type": "json_schema", "json_schema": {...} }` (**Structured Outputs**) | Output **strictly** matches your schema — wrong field names, missing required keys, and extra properties are impossible |

**Use Structured Outputs.** It removes 80% of the retry logic you'd otherwise need. Available on `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `gpt-4.1-mini`, `o3-mini`, `o4-mini`, and newer. Set `strict: true` inside the schema definition.

The validation pass in code becomes much smaller — you only need to check semantic constraints (banned phrases, paragraph length, calibration sanity), not structural ones.

---

## Input Contract

Stable JSON shape across all three calls:

```json
{
  "participant": {
    "name": "Priya Subramanian",
    "designation": "Senior Manager, Digital Banking",
    "department": "Retail Banking",
    "division": "Digital Channels",
    "manager": "Ananya Iyer",
    "location": "Bengaluru",
    "cohort": "AC Cohort 12",
    "assessment_date": "March 2026"
  },
  "programme": {
    "name": "Project Viksit Artha — Strategic Task Force GD",
    "scenario_summary": "20-minute leaderless GD on whether India should go Cashless-First...",
    "activities": ["Group Discussion"]
  },
  "context": {
    "other_participants": ["Rohan", "Aakash", "Meera", "Saurabh", "Neha"],
    "target_role": "Senior Leadership Track — Strategy & Decision Roles"
  },
  "scoring": {
    "Communication & Influencing": {
      "Clear & Confident Communication": {
        "score": 4,
        "anchor": "Articulates nuanced views with high impact using structured frameworks.",
        "evidence": "Opened the discussion at minute 1 with a context-setting frame..."
      },
      "Influencing & Persuasion": {
        "score": 3,
        "anchor": "Uses logic and facts to build a case and gain basic agreement.",
        "evidence": "Built the case for offline digital tokens using two specific data points..."
      }
    }
  }
}
```

The `evidence` field is the assessor's raw observation. Without specifics in the input, you cannot get specifics in the output.

---

## The Style Guide — System Message for All Three Calls

This goes into the `system` role message of every call. Non-negotiable.

```
You are a senior occupational psychologist generating prose for an Assessment
Centre report. You convert assessor evidence into evaluative, synthesised
narrative — not collated input.

STYLE RULES — apply absolutely:

1. Open paragraphs with a verb, decision, or specific behaviour. Never with
   "In the [Activity]…" or "[Name] demonstrated…".

2. Every paragraph contains at least one named decision, stakeholder,
   artefact, quoted phrase, number, or specified omission.

3. Banned phrases (do not use in any form):
   - "demonstrated the strength of"
   - "exhibited the strength of"
   - "showed a strength in"
   - "there are areas of opportunity in"
   - "there is a development opportunity to"
   - "made attempts to ... which had a moderate impact"
   - "this is essential for higher management roles"
   - "this is crucial for effective leadership"

4. Past tense. Third person. The participant's name appears at most once
   or twice per paragraph.

5. Direct, evaluative tone. Name what is missing in development areas;
   do not euphemise as growth language.

6. Synthesise across activities — do not list activity-by-activity.

7. Synthesised prose should be roughly 30-50% shorter than the raw evidence
   it draws on.

8. If a paragraph could be lifted into another candidate's report unchanged,
   rewrite it.

The response_format will enforce JSON schema compliance. Focus your effort
on the quality of the prose inside the JSON fields, not on the structure.
```

---

## CALL 1 — Competency Profiles

### Python (OpenAI SDK v1.x)

```python
from openai import OpenAI
client = OpenAI()  # reads OPENAI_API_KEY from env

def generate_competency_profiles(input_json: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": STYLE_GUIDE_SYSTEM_MESSAGE},
            {"role": "user", "content": COMPETENCY_PROFILES_USER_PROMPT.format(
                input_json=json.dumps(input_json, indent=2)
            )},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "competency_profiles_response",
                "strict": True,
                "schema": COMPETENCY_PROFILES_SCHEMA,
            },
        },
        temperature=0.4,
        max_tokens=4000,
    )
    return json.loads(response.choices[0].message.content)
```

### User prompt template

```
Generate the synthesised prose for the assessment report.

INPUT:
{input_json}

REQUIREMENTS:
- The "overall_intro" must name the dominant pattern in 2-3 sentences. End with a development thesis.
- Every "title" must be a noun phrase that captures the specific behaviour, not a generic competency name.
- Every "body" anchors at least one named participant, minute timestamp, quoted phrase, number, or specified omission from the input evidence.
- For each competency in the input, produce both a "strengths" and a "development" paragraph.
- Where evidence is thin, the paragraph is shorter — never padded with generic descriptors.
- For development paragraphs, name what would have moved the score up by one band, citing the next BARS anchor where useful.
- Each "body" paragraph must be between 60 and 200 words.
- Each "title" must be 3-7 words.
```

### JSON Schema

```python
COMPETENCY_PROFILES_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["overall_intro", "overall_strengths", "overall_development_areas", "competency_profiles"],
    "properties": {
        "overall_intro": {
            "type": "string",
            "description": "2-3 sentence diagnostic intro naming the dominant pattern, ending with a development thesis."
        },
        "overall_strengths": {
            "type": "array",
            "minItems": 4,
            "maxItems": 4,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "body"],
                "properties": {
                    "title": {"type": "string", "description": "3-7 word noun phrase"},
                    "body": {"type": "string", "description": "60-200 word paragraph"}
                }
            }
        },
        "overall_development_areas": {
            "type": "array",
            "minItems": 4,
            "maxItems": 5,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "body"],
                "properties": {
                    "title": {"type": "string"},
                    "body": {"type": "string"}
                }
            }
        },
        "competency_profiles": {
            "type": "object",
            "description": "Keys are competency names from the input. Each has 'strengths' and 'development' paragraphs.",
            "additionalProperties": {
                "type": "object",
                "additionalProperties": False,
                "required": ["strengths", "development"],
                "properties": {
                    "strengths": {"type": "string"},
                    "development": {"type": "string"}
                }
            }
        }
    }
}
```

> **Note on `additionalProperties`**: OpenAI's strict mode requires `additionalProperties: false` on every object **except** when you genuinely want a dictionary with arbitrary keys (like `competency_profiles` keyed by competency name). For the dictionary case, use `additionalProperties: {schema}` instead of `false` — this lets the keys be free-form while still constraining the values.

### Validation pass (in code, after the LLM call)

Structured Outputs guarantees the JSON is valid and schema-conformant. You only need to check **semantic** constraints:

```python
import re

BANNED_PHRASES = [
    r"demonstrated the strength of",
    r"exhibited the strength of",
    r"showed a strength in",
    r"there are areas of opportunity in",
    r"there is a development opportunity to",
    r"made attempts to.*moderate impact",
]
BANNED_OPENINGS = [r"^In the \w+ ", r"^\w+ demonstrated ", r"^\w+ showed "]

def validate_profiles(response: dict) -> list[str]:
    errors = []
    pattern = re.compile("|".join(BANNED_PHRASES), re.IGNORECASE)
    opening_pattern = re.compile("|".join(BANNED_OPENINGS))

    def check_paragraph(text: str, location: str):
        if pattern.search(text):
            errors.append(f"{location}: banned phrase detected")
        if opening_pattern.match(text):
            errors.append(f"{location}: banned opening pattern")
        word_count = len(text.split())
        if word_count < 40:
            errors.append(f"{location}: too short ({word_count} words)")
        if word_count > 220:
            errors.append(f"{location}: too long ({word_count} words)")

    check_paragraph(response["overall_intro"], "overall_intro")
    for i, item in enumerate(response["overall_strengths"]):
        check_paragraph(item["body"], f"strengths[{i}].body")
    for i, item in enumerate(response["overall_development_areas"]):
        check_paragraph(item["body"], f"dev_areas[{i}].body")
    for comp_name, profile in response["competency_profiles"].items():
        check_paragraph(profile["strengths"], f"{comp_name}.strengths")
        check_paragraph(profile["development"], f"{comp_name}.development")

    return errors

# In your generation flow:
errors = validate_profiles(response)
if errors:
    # Retry once with the errors as feedback in the user message
    # If retry also fails, surface to operator — likely thin input evidence
    ...
```

---

## CALL 2 — AI-Powered Insights

### Additional rules in system message (append to style guide)

```
ADDITIONAL RULES FOR INSIGHTS:

- Every claim must be inferable from the input evidence. Do not speculate
  beyond what the scores and observations support.
- Predictive indicators must include a specific mitigation, not generic advice.
- Likelihood scores (X/10) reflect probability without intervention. Be calibrated:
  9-10 means "almost certain", 7-8 means "likely", 5-6 means "possible".
- The behavioural archetype name should be 2-3 words, evocative but not cute.
- Avoid astrology-style descriptions that could fit anyone — anchor every
  claim to specific evidence in the input.
```

### User prompt

```
Generate the AI-Powered Insights section for the assessment report.

INPUT:
{input_json}

REQUIREMENTS:
- Produce 2-3 cross-competency patterns. Each pattern must name two specific
  competencies or sub-competencies that interact.
- Produce 3-5 predictive indicators. Mix at least one OPPORTUNITY among the RISKs.
- "current_fit" and "potential_fit" should be calibrated — 1-10 scale, with
  potential_fit > current_fit by a credible margin (typically 1-3 points).
- Behavioural archetype name: 2-3 words.
```

### JSON Schema

```python
AI_INSIGHTS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["archetype", "cross_competency_patterns", "predictive_indicators", "role_fit"],
    "properties": {
        "archetype": {
            "type": "object",
            "additionalProperties": False,
            "required": ["name", "description", "core_strengths", "watchouts", "deployment_best", "deployment_caution"],
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "core_strengths": {
                    "type": "array",
                    "minItems": 3,
                    "maxItems": 3,
                    "items": {"type": "string"}
                },
                "watchouts": {
                    "type": "array",
                    "minItems": 2,
                    "maxItems": 3,
                    "items": {"type": "string"}
                },
                "deployment_best": {"type": "string"},
                "deployment_caution": {"type": "string"}
            }
        },
        "cross_competency_patterns": {
            "type": "array",
            "minItems": 2,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "description", "risk", "opportunity"],
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "risk": {"type": "string"},
                    "opportunity": {"type": "string"}
                }
            }
        },
        "predictive_indicators": {
            "type": "array",
            "minItems": 3,
            "maxItems": 5,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["indicator", "type", "timeframe", "likelihood", "mitigation"],
                "properties": {
                    "indicator": {"type": "string"},
                    "type": {"type": "string", "enum": ["RISK", "OPPORTUNITY"]},
                    "timeframe": {"type": "string", "enum": ["0-6 months", "6-12 months", "12-24 months"]},
                    "likelihood": {"type": "integer", "minimum": 1, "maximum": 10},
                    "mitigation": {"type": "string"}
                }
            }
        },
        "role_fit": {
            "type": "object",
            "additionalProperties": False,
            "required": ["title", "current_fit", "potential_fit", "timeline", "narrative", "critical_gaps"],
            "properties": {
                "title": {"type": "string"},
                "current_fit": {"type": "integer", "minimum": 1, "maximum": 10},
                "potential_fit": {"type": "integer", "minimum": 1, "maximum": 10},
                "timeline": {"type": "string"},
                "narrative": {"type": "string"},
                "critical_gaps": {
                    "type": "array",
                    "minItems": 3,
                    "maxItems": 5,
                    "items": {"type": "string"}
                }
            }
        }
    }
}
```

### Validation

```python
def validate_insights(response: dict) -> list[str]:
    errors = []
    role = response["role_fit"]
    if role["potential_fit"] <= role["current_fit"]:
        errors.append(f"role_fit: potential ({role['potential_fit']}) must exceed current ({role['current_fit']})")
    
    has_opportunity = any(p["type"] == "OPPORTUNITY" for p in response["predictive_indicators"])
    if not has_opportunity:
        errors.append("predictive_indicators: must include at least one OPPORTUNITY")
    
    # Run the same banned-phrase check as Call 1 across all string fields
    # (omitted for brevity — same regex pattern)
    
    return errors
```

---

## CALL 3 — 70-20-10 Recommendations

### Additional system rules

```
ADDITIONAL RULES FOR RECOMMENDATIONS:

- Every recommendation is specific, time-bound, and addressable. No "develop X
  further" or "work on Y".
- The 70% strand is on-the-job behaviour change in the candidate's current
  role. The 20% strand is mentor/peer/coach. The 10% strand is books, courses,
  certifications.
- Books named must be real and relevant. Courses named should be findable
  (Coursera, LinkedIn Learning, HBS Online, CIMA, etc.).
- Number of bullets: 70% gets 2-3, 20% gets 1-2, 10% gets 1-3.
- Priority is computed from the competency score: HIGH for <2.6, MEDIUM for
  2.6-3.4, LOW for >=3.5.
```

### JSON Schema

```python
RECOMMENDATIONS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["recommendations", "next_steps"],
    "properties": {
        "recommendations": {
            "type": "object",
            "description": "Keys are competency names from the input.",
            "additionalProperties": {
                "type": "object",
                "additionalProperties": False,
                "required": ["priority", "score", "intro", "70", "20", "10"],
                "properties": {
                    "priority": {"type": "string", "enum": ["HIGH", "MEDIUM", "LOW"]},
                    "score": {"type": "number"},
                    "intro": {"type": "string"},
                    "70": {
                        "type": "array",
                        "minItems": 2,
                        "maxItems": 3,
                        "items": {"type": "string"}
                    },
                    "20": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 2,
                        "items": {"type": "string"}
                    },
                    "10": {
                        "type": "array",
                        "minItems": 1,
                        "maxItems": 3,
                        "items": {"type": "string"}
                    }
                }
            }
        },
        "next_steps": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {"type": "string"}
        }
    }
}
```

### Validation

```python
def validate_recommendations(response: dict, scoring: dict) -> list[str]:
    errors = []
    for comp_name, rec in response["recommendations"].items():
        # Sanity-check priority matches score band
        score = rec["score"]
        expected_priority = "HIGH" if score < 2.6 else "MEDIUM" if score < 3.5 else "LOW"
        if rec["priority"] != expected_priority:
            errors.append(f"{comp_name}: priority {rec['priority']} doesn't match score {score}")
        # Catch generic one-liners
        for strand in ["70", "20", "10"]:
            for i, bullet in enumerate(rec[strand]):
                if len(bullet.split()) < 8:
                    errors.append(f"{comp_name}.{strand}[{i}]: too short, likely generic")
    return errors
```

---

## Model Choice and Cost Notes

OpenAI catalogue trade-offs:

| Model | Best for | Notes |
|---|---|---|
| `gpt-4o` | All three calls | Strong synthesis quality. Good default. |
| `gpt-4.1` | All three calls | Newer, slightly stronger reasoning. Marginal cost increase. |
| `gpt-4o-mini` | Call 3 (Recommendations) | More formulaic content; mini is sufficient and ~10x cheaper. |
| `gpt-4.1-mini` | Call 3 alternative | Same trade-off; newer mini. |
| `o3-mini` / `o4-mini` | Avoid for prose | Reasoning models — overkill for synthesis, slower, more expensive per usable token. |

**Suggested mix for production:**
- Call 1 (Competency Profiles) — `gpt-4o` or `gpt-4.1`
- Call 2 (AI Insights) — `gpt-4o` or `gpt-4.1`
- Call 3 (Recommendations) — `gpt-4o-mini` or `gpt-4.1-mini`

**Token budget per report:** ~8-12k input, ~4-6k output across all three calls.

**Temperature:** Use `0.3-0.5` for all three. Lower than 0.3 makes prose feel mechanical; higher than 0.5 lets the model drift from the evidence.

---

## Suggested Backend Layout

```
your_app/
├── reports/
│   ├── __init__.py
│   ├── prompts.py          # system messages + user prompt templates
│   ├── schemas.py          # JSON Schema definitions for all 3 calls
│   ├── validators.py       # banned-phrase + semantic checks
│   ├── generator.py        # the 3-call orchestrator
│   └── renderer.py         # your HTML/PDF builder (no LLM)
├── api/
│   └── reports.py          # FastAPI / Flask endpoints
└── ...
```

### Orchestrator skeleton

```python
import json
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI()

async def call_with_retry(messages, schema, schema_name, validator, max_retries=2):
    """Call OpenAI with structured output and validate. Retry once on validation failure."""
    for attempt in range(max_retries):
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": schema_name, "strict": True, "schema": schema},
            },
            temperature=0.4,
        )
        result = json.loads(response.choices[0].message.content)
        errors = validator(result)
        if not errors:
            return result
        # Retry with errors as feedback
        messages.append({
            "role": "user",
            "content": f"The previous response had these issues:\n{errors}\n\nRegenerate the JSON with these fixed."
        })
    raise RuntimeError(f"Validation failed after {max_retries} attempts: {errors}")


async def generate_report(input_data: dict) -> dict:
    """Run all three calls in parallel where possible."""
    profiles_task = call_with_retry(
        build_messages(STYLE_GUIDE, COMPETENCY_PROFILES_PROMPT, input_data),
        COMPETENCY_PROFILES_SCHEMA, "profiles", validate_profiles,
    )
    insights_task = call_with_retry(
        build_messages(STYLE_GUIDE + INSIGHTS_RULES, AI_INSIGHTS_PROMPT, input_data),
        AI_INSIGHTS_SCHEMA, "insights", validate_insights,
    )
    recs_task = call_with_retry(
        build_messages(STYLE_GUIDE + RECS_RULES, RECOMMENDATIONS_PROMPT, input_data),
        RECOMMENDATIONS_SCHEMA, "recommendations",
        lambda r: validate_recommendations(r, input_data["scoring"]),
    )
    
    profiles, insights, recommendations = await asyncio.gather(
        profiles_task, insights_task, recs_task
    )
    
    return {
        "profiles": profiles,
        "insights": insights,
        "recommendations": recommendations,
    }
```

The three calls are **independent** of each other — they all read the same input JSON. You can run them in parallel with `asyncio.gather` to cut total wall-clock time roughly to the slowest single call (~30 seconds instead of ~90 seconds sequential).

### API endpoint pattern

```python
from fastapi import FastAPI, BackgroundTasks
from uuid import uuid4

app = FastAPI()
report_store = {}  # use Redis / DB in production

@app.post("/reports/generate")
async def create_report(input_data: dict, bg: BackgroundTasks):
    report_id = str(uuid4())
    report_store[report_id] = {"status": "queued"}
    bg.add_task(process_report, report_id, input_data)
    return {"report_id": report_id, "status": "queued"}

async def process_report(report_id: str, input_data: dict):
    try:
        result = await generate_report(input_data)
        pdf_bytes = render_pdf(input_data, result)
        report_store[report_id] = {
            "status": "complete",
            "json": result,
            "pdf": pdf_bytes,
        }
    except Exception as e:
        report_store[report_id] = {"status": "failed", "error": str(e)}

@app.get("/reports/{report_id}")
async def get_report(report_id: str):
    return report_store.get(report_id, {"status": "not_found"})
```

---

## OpenAI-Specific Failure Modes

| Failure | What you see | Fix |
|---|---|---|
| **Refusal** | `response.choices[0].message.refusal` is non-null | The model refused on safety grounds. Rare for assessment content, but check the refusal field before parsing content. |
| **Length cutoff** | `finish_reason == "length"`, JSON is truncated | Bump `max_tokens`; for Call 1 you need at least 4000. |
| **Schema rejection at request time** | 400 error on `client.chat.completions.create` | Your JSON Schema has an invalid construct. Common: `additionalProperties` missing, recursive `$ref` not allowed in strict mode, unsupported types. Test schemas with the [OpenAI schema validator](https://platform.openai.com/docs/guides/structured-outputs#how-to-use). |
| **Rate limit (429)** | `RateLimitError` exception | Use `tenacity` retry with exponential backoff, or batch reports through a queue. |
| **Inflated role-fit numbers** | Both scores 8/10 even for weak candidates | Add an explicit calibration anchor in the prompt: *"A score of 7+ means top-quartile readiness. Be honest about gaps."* |
| **Generic recommendations** | "Read books on leadership" instead of named titles | The model is being lazy. Add 2-3 examples of well-formed recommendations in the prompt as few-shot anchors. |

---

## Strict Mode Schema Constraints — Watch Out For These

OpenAI's Structured Outputs has stricter rules than vanilla JSON Schema:

- **Every object must have `additionalProperties: false`** (unless you genuinely want a dict with arbitrary keys, in which case use `additionalProperties: {schema}`).
- **All fields in `properties` must appear in `required`.** No optional fields. If you need optionality, use `"type": ["string", "null"]` instead.
- **No `oneOf` / `anyOf` at the root level** in strict mode.
- **`$ref` is supported** but recursion is not.
- **Enums are encouraged** for fixed-value fields like `type: RISK | OPPORTUNITY`.

If your schema gets rejected with a 400, the error message is usually specific enough to fix in one pass.

---

## Quick-Start: Minimum Viable Integration

```python
# Single-file MVP — works as-is once you set OPENAI_API_KEY
import os, json
from openai import OpenAI
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

STYLE_GUIDE = """[paste the style guide system message from above]"""

SCHEMA = {  # Just Call 1 to start
    "type": "object",
    "additionalProperties": False,
    "required": ["overall_intro", "overall_strengths", "overall_development_areas", "competency_profiles"],
    "properties": { ... }  # paste from above
}

def generate_profiles(input_data: dict) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": STYLE_GUIDE},
            {"role": "user", "content": f"Generate the synthesised prose.\n\nINPUT:\n{json.dumps(input_data, indent=2)}"},
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "profiles", "strict": True, "schema": SCHEMA},
        },
        temperature=0.4,
    )
    return json.loads(response.choices[0].message.content)

# Test it
result = generate_profiles({...your input...})
print(json.dumps(result, indent=2))
```

Get this working with one call first, then add Calls 2 and 3, then add async parallelisation, then add the validation retry loop. In that order — don't try to build all of it before the first end-to-end works.

---

## Differences from the Anthropic Version (Quick Reference)

If you saw the Anthropic version of this pack:

| | Anthropic | OpenAI |
|---|---|---|
| System message | Top-level `system` parameter | `messages[0]` with `role: "system"` |
| JSON enforcement | Validation + retry loop | Native Structured Outputs (`response_format`) |
| Required check | Manual regex on output | Schema rejects at generation time |
| Optional fields | Allowed | Use `["string", "null"]` instead |
| Best models for synthesis | `claude-opus-4-7`, `claude-sonnet-4-6` | `gpt-4o`, `gpt-4.1` |
| Refusal handling | `stop_reason == "refusal"` | `message.refusal` field |
| Async pattern | `AsyncAnthropic` | `AsyncOpenAI` |

The prompts themselves don't change. Only the integration shell does.
