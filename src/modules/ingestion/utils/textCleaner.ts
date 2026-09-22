export const cleanResumeText = (rawText: string): string => {
	if (typeof rawText !== "string") {
		return "";
	}

	const withoutControlCharacters = rawText
		.replace(/\r\n?/g, "\n")
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
		.replace(/\u00A0/g, " ")
		.replace(/\t/g, " ")
		.trim();

	if (!withoutControlCharacters) {
		return "";
	}

	return withoutControlCharacters
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter((line) => line.length > 0)
		.join("\n");
};