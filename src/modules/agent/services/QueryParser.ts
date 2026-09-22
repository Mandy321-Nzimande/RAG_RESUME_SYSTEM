export interface ParsedQuery {
  hard_constraints: Record<string, Record<string, number | string | boolean>>;
  semantic_query: string;
  has_hard_constraints: boolean;
}

const STRICT_EXPERIENCE_PATTERNS: Array<{
  pattern: RegExp;
  operator: "$lt" | "$lte" | "$gt" | "$gte";
}> = [
  { pattern: /(?:less than|under|fewer than)\s+([\w.]+)\s+years?/i, operator: "$lt" },
  { pattern: /(?:at most|up to|no more than)\s+([\w.]+)\s+years?/i, operator: "$lte" },
  { pattern: /(?:more than|over|greater than)\s+([\w.]+)\s+years?/i, operator: "$gt" },
  { pattern: /(?:at least|minimum of|minimum)\s+([\w.]+)\s+years?/i, operator: "$gte" }
];

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

function parseNumber(value: string): number | undefined {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : NUMBER_WORDS[value.toLowerCase()];
}

const STRICT_LOCATION_PATTERN = /\b(?:must be|need(?:s)? to be|based)\s+(?:located |based )?in\s+([A-Za-z][A-Za-z .'-]*?)(?=\s*(?:,|;|\band\b|\bwith\b|\bwho\b|$))/i;
const STRICT_DEGREE_PATTERN = /\b(?:must have|requires?|requiring)\s+(?:a\s+)?((?:bachelor(?:'s)?|master(?:'s)?|doctorate|phd)(?:\s+degree)?)\b/i;
const STRICT_CERTIFICATION_PATTERN = /\b(?:must have|requires?|requiring)\s+([A-Za-z0-9][A-Za-z0-9 .+#-]*?)\s+(?:certification|certificate)\b/i;

function cleanSemanticQuery(query: string, consumed: string[], hasExperienceConstraint: boolean): string {
  let semantic = query;
  for (const fragment of consumed) semantic = semantic.replace(fragment, " ");
  if (hasExperienceConstraint) semantic = semantic.replace(/\bexperience\b/i, " ");
  return semantic
    .replace(/\s*(?:,|;|\band\b)\s*(?=\b(?:with|familiar|experience|knowledge|skills?|developer|engineer|analyst)\b)/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:and|or)\b[\s,;]*/i, "")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .trim();
}

export function parseRecruiterQuery(query: string): ParsedQuery {
  const normalized = query.trim();
  const hard_constraints: ParsedQuery["hard_constraints"] = {};
  const consumed: string[] = [];

  for (const { pattern, operator } of STRICT_EXPERIENCE_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      const years = parseNumber(match[1]);
      if (years !== undefined) {
        hard_constraints.experience_years = { [operator]: years };
        consumed.push(match[0]);
        break;
      }
    }
  }

  const locationMatch = normalized.match(STRICT_LOCATION_PATTERN);
  if (locationMatch) {
    hard_constraints.location = { $eq: locationMatch[1].trim() };
    consumed.push(locationMatch[0]);
  }

  const degreeMatch = normalized.match(STRICT_DEGREE_PATTERN);
  if (degreeMatch) {
    hard_constraints.education = { $regex: degreeMatch[1].trim() };
    consumed.push(degreeMatch[0]);
  }

  const certificationMatch = normalized.match(STRICT_CERTIFICATION_PATTERN);
  if (certificationMatch) {
    hard_constraints.certification = { $eq: certificationMatch[1].trim() };
    consumed.push(certificationMatch[0]);
  }

  return {
    hard_constraints,
    semantic_query: cleanSemanticQuery(normalized, consumed, "experience_years" in hard_constraints),
    has_hard_constraints: Object.keys(hard_constraints).length > 0
  };
}