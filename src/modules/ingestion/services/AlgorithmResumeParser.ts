import { detectSkills } from "../../../config/skills";
import { ParsedResume } from "../types/ingestion.types";
import { EXPERIENCE_REGEX, EMAIL_REGEX, PHONE_REGEX, extractExperienceYears } from "../utils/regex";
import { cleanResumeText } from "../utils/textCleaner";

const ROLE_PATTERN = /\b(architect|engineer|developer|tester|analyst|manager|consultant|designer|specialist|lead|director)\b/i;
const COMPANY_PATTERN = /\b(private limited|pvt\.?\s*ltd\.?|ltd\.?|llp|inc\.?|corp\.?|solutions|technologies|software)\b/i;
const EDUCATION_PATTERN = /\b(b\.?\s*tech|m\.?\s*tech|bachelor|master|degree|diploma|ph\.?d|university|college)\b/i;

const firstMatchingLine = (lines: string[], pattern: RegExp): string | undefined =>
	lines.find((line) => pattern.test(line));

export class AlgorithmResumeParser {
	parseResume(rawText: string): ParsedResume {
		const cleanText = cleanResumeText(rawText);
		const lines = cleanText.split("\n").filter(Boolean);
		const email = cleanText.match(EMAIL_REGEX)?.[0];
		const phone = cleanText.match(PHONE_REGEX)?.[0];
		const role = firstMatchingLine(lines, ROLE_PATTERN);
		const company = firstMatchingLine(lines, COMPANY_PATTERN);
		const education = firstMatchingLine(lines, EDUCATION_PATTERN);
		const totalExperience = extractExperienceYears(cleanText);
		const name = this.findName(lines, email, role, company);
		const jobTitles = role ? [role] : undefined;

		return {
			...(name ? { name } : {}),
			...(email ? { email } : {}),
			...(phone ? { phone } : {}),
			...(company ? { company } : {}),
			...(role ? { role } : {}),
			...(education ? { education } : {}),
			...(totalExperience !== undefined ? { totalExperience } : {}),
			...(totalExperience !== undefined ? { relevantExperience: totalExperience } : {}),
			skills: detectSkills(cleanText),
			...(jobTitles ? { jobTitles } : {}),
			...(totalExperience !== undefined ? { experienceSummary: `${totalExperience}+ years of experience` } : {})
		};
	}

	private findName(lines: string[], email?: string, role?: string, company?: string): string | undefined {
		return lines.find((line) => {
			if (line === email || line === role || line === company) {
				return false;
			}

			return /^[A-Za-z][A-Za-z .'-]{2,}$/.test(line) &&
				!EXPERIENCE_REGEX.test(line) &&
				!EDUCATION_PATTERN.test(line) &&
				!COMPANY_PATTERN.test(line);
		});
	}
}