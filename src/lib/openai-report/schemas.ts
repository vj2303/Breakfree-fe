/**
 * JSON Schema definitions for OpenAI Structured Outputs — all 3 calls.
 * NOTE: OpenAI strict mode does NOT support `additionalProperties: {schema}` (free-form dict keys).
 * All dictionaries are converted to arrays with a `competency_name` field.
 */

export const COMPETENCY_PROFILES_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: [
    "overall_intro",
    "overall_strengths",
    "overall_development_areas",
    "competency_profiles",
  ],
  properties: {
    overall_intro: {
      type: "string" as const,
      description:
        "2-3 sentence diagnostic intro naming the dominant pattern, ending with a development thesis.",
    },
    overall_strengths: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["title", "body"],
        properties: {
          title: {
            type: "string" as const,
            description: "3-7 word noun phrase",
          },
          body: {
            type: "string" as const,
            description: "60-200 word paragraph",
          },
        },
      },
    },
    overall_development_areas: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["title", "body"],
        properties: {
          title: { type: "string" as const },
          body: { type: "string" as const },
        },
      },
    },
    competency_profiles: {
      type: "array" as const,
      description:
        "One entry per competency from the input. Each has a name, strengths paragraph, and development paragraph.",
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["competency_name", "strengths", "development"],
        properties: {
          competency_name: {
            type: "string" as const,
            description: "Competency name from the input scoring data.",
          },
          strengths: { type: "string" as const },
          development: { type: "string" as const },
        },
      },
    },
  },
};

export const AI_INSIGHTS_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: [
    "archetype",
    "cross_competency_patterns",
    "predictive_indicators",
    "role_fit",
  ],
  properties: {
    archetype: {
      type: "object" as const,
      additionalProperties: false,
      required: [
        "name",
        "description",
        "core_strengths",
        "watchouts",
        "deployment_best",
        "deployment_caution",
      ],
      properties: {
        name: { type: "string" as const },
        description: { type: "string" as const },
        core_strengths: {
          type: "array" as const,
          items: { type: "string" as const },
        },
        watchouts: {
          type: "array" as const,
          items: { type: "string" as const },
        },
        deployment_best: { type: "string" as const },
        deployment_caution: { type: "string" as const },
      },
    },
    cross_competency_patterns: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: ["title", "description", "risk", "opportunity"],
        properties: {
          title: { type: "string" as const },
          description: { type: "string" as const },
          risk: { type: "string" as const },
          opportunity: { type: "string" as const },
        },
      },
    },
    predictive_indicators: {
      type: "array" as const,
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "indicator",
          "type",
          "timeframe",
          "likelihood",
          "mitigation",
        ],
        properties: {
          indicator: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: ["RISK", "OPPORTUNITY"],
          },
          timeframe: {
            type: "string" as const,
            enum: ["0-6 months", "6-12 months", "12-24 months"],
          },
          likelihood: { type: "integer" as const },
          mitigation: { type: "string" as const },
        },
      },
    },
    role_fit: {
      type: "object" as const,
      additionalProperties: false,
      required: [
        "title",
        "current_fit",
        "potential_fit",
        "timeline",
        "narrative",
        "critical_gaps",
      ],
      properties: {
        title: { type: "string" as const },
        current_fit: { type: "integer" as const },
        potential_fit: { type: "integer" as const },
        timeline: { type: "string" as const },
        narrative: { type: "string" as const },
        critical_gaps: {
          type: "array" as const,
          items: { type: "string" as const },
        },
      },
    },
  },
};

export const RECOMMENDATIONS_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["recommendations", "next_steps"],
  properties: {
    recommendations: {
      type: "array" as const,
      description: "One entry per competency from the input.",
      items: {
        type: "object" as const,
        additionalProperties: false,
        required: [
          "competency_name",
          "priority",
          "score",
          "intro",
          "on_the_job",
          "coaching",
          "formal_learning",
        ],
        properties: {
          competency_name: {
            type: "string" as const,
            description: "Competency name from the input scoring data.",
          },
          priority: {
            type: "string" as const,
            enum: ["HIGH", "MEDIUM", "LOW"],
          },
          score: { type: "number" as const },
          intro: { type: "string" as const },
          on_the_job: {
            type: "array" as const,
            description: "70% on-the-job behaviour change recommendations (2-3 items).",
            items: { type: "string" as const },
          },
          coaching: {
            type: "array" as const,
            description: "20% mentor/peer/coach recommendations (1-2 items).",
            items: { type: "string" as const },
          },
          formal_learning: {
            type: "array" as const,
            description: "10% books, courses, certifications (1-3 items).",
            items: { type: "string" as const },
          },
        },
      },
    },
    next_steps: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
};
