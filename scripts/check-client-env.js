"use strict";

const fs = require("fs");
const path = require("path");

// Create React App embeds every REACT_APP_* value into browser JavaScript.
// These names are credentials and therefore must only exist on the backend.
const FORBIDDEN_EXACT_NAMES = new Set([
	"REACT_APP_HOTEL_RUNNER_TOKEN",
	"REACT_APP_HOTELRUNNER_TOKEN",
	"REACT_APP_HOTEL_RUNNER_API_TOKEN",
	"REACT_APP_HOTELRUNNER_API_TOKEN",
	"REACT_APP_HOTEL_RUNNER_API_KEY",
	"REACT_APP_HOTELRUNNER_API_KEY",
	"REACT_APP_HOTEL_RUNNER_KEY",
	"REACT_APP_HOTELRUNNER_KEY",
	"REACT_APP_HR_API_KEY",
	"REACT_APP_HR_KEY",
	"REACT_APP_HR_ID",
	"REACT_APP_HOTEL_RUNNER_HR_ID",
	"REACT_APP_HOTELRUNNER_HR_ID",
	"REACT_APP_GOOGLE_CLIENT_SECRET",
	"REACT_APP_SECRET_KEY",
	"REACT_APP_ACCESS_TOKEN",
]);

// These four names predate this guard and are already used as browser-visible
// UI convenience prompts in the existing PMS. They are not authorization
// boundaries: the protected backend operations still require authenticated,
// role-scoped access. Keep the exception exact so a same-day HotelRunner release
// does not change unrelated PMS UX, while every new password/passcode-like name
// remains blocked. Their values must never be reused as server credentials.
const LEGACY_BROWSER_UI_GATE_NAMES = new Set([
	"REACT_APP_REPORTS",
	"REACT_APP_INTEGRATOR_PASSWORD",
	"REACT_APP_CUSTOMER_SERVICE",
	"REACT_APP_PASSCODE",
]);

// Catch future server credentials without rejecting browser-public identifiers
// such as OAuth client IDs, payment publishable keys, or restricted Maps keys.
const FORBIDDEN_SERVER_ONLY_MARKERS = [
	"CLIENT_SECRET",
	"SECRET",
	"SECRET_KEY",
	"PRIVATE_KEY",
	"ACCESS_TOKEN",
	"API_TOKEN",
	"AUTH_TOKEN",
	"BEARER_TOKEN",
	"REFRESH_TOKEN",
	"DATABASE_URL",
	"MONGODB_URI",
	"JWT_SECRET",
	"SESSION_SECRET",
	"WEBHOOK_SECRET",
	"SIGNING_KEY",
	"ENCRYPTION_KEY",
	"SERVICE_ACCOUNT_KEY",
	"PASSWORD",
	"PASSCODE",
];

const ENV_NAME_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=/;

const parseEnvVariableNames = (contents) => {
	const names = [];

	for (const rawLine of String(contents).split(/\r?\n/u)) {
		const line = rawLine.replace(/^\uFEFF/u, "");
		if (!line.trim() || line.trimStart().startsWith("#")) continue;
		const match = line.match(ENV_NAME_PATTERN);
		if (match) names.push(match[1]);
	}

	return names;
};

const isForbiddenClientVariable = (name) => {
	if (LEGACY_BROWSER_UI_GATE_NAMES.has(name)) return false;
	if (FORBIDDEN_EXACT_NAMES.has(name)) return true;
	if (!name.startsWith("REACT_APP_")) return false;

	const clientName = name.slice("REACT_APP_".length);
	const paddedClientName = `_${clientName}_`;
	return FORBIDDEN_SERVER_ONLY_MARKERS.some(
		(marker) => paddedClientName.includes(`_${marker}_`),
	);
};

const envFilesForMode = (mode) => {
	const normalizedMode = String(mode || "production").trim() || "production";
	return [
		`.env.${normalizedMode}.local`,
		...(normalizedMode === "test" ? [] : [".env.local"]),
		`.env.${normalizedMode}`,
		".env",
	];
};

const findForbiddenClientEnvironment = ({
	rootDir,
	mode = "production",
	inheritedEnvironment = process.env,
}) => {
	const findings = [];

	for (const relativePath of envFilesForMode(mode)) {
		const absolutePath = path.join(rootDir, relativePath);
		if (!fs.existsSync(absolutePath)) continue;

		const names = parseEnvVariableNames(fs.readFileSync(absolutePath, "utf8"));
		const forbiddenNames = [...new Set(names.filter(isForbiddenClientVariable))].sort();
		if (forbiddenNames.length > 0) {
			findings.push({ source: relativePath, names: forbiddenNames });
		}
	}

	const inheritedNames = Object.keys(inheritedEnvironment || {})
		.filter(isForbiddenClientVariable)
		.sort();
	if (inheritedNames.length > 0) {
		findings.push({ source: "process environment", names: inheritedNames });
	}

	return findings;
};

const formatFailure = (findings, mode) => {
	const lines = [
		`Client environment security check failed for ${mode}.`,
		"Create React App would embed these server-only variable names into browser JavaScript:",
	];

	for (const finding of findings) {
		lines.push(`- ${finding.source}: ${finding.names.join(", ")}`);
	}

	lines.push(
		"Move these credentials to the backend environment and remove the names from the frontend environment before starting or building.",
		"No environment values were logged.",
	);

	return lines.join("\n");
};

const parseMode = (argv) => {
	const modeIndex = argv.indexOf("--mode");
	if (modeIndex === -1) return "production";
	const mode = argv[modeIndex + 1];
	if (!mode || mode.startsWith("--")) {
		throw new Error("--mode requires a value");
	}
	return mode;
};

const run = ({
	rootDir = path.resolve(__dirname, ".."),
	mode = "production",
	inheritedEnvironment = process.env,
} = {}) => {
	const findings = findForbiddenClientEnvironment({
		rootDir,
		mode,
		inheritedEnvironment,
	});

	if (findings.length > 0) {
		throw new Error(formatFailure(findings, mode));
	}

	return `Client environment security check passed for ${mode}.`;
};

if (require.main === module) {
	try {
		const mode = parseMode(process.argv.slice(2));
		console.log(run({ mode }));
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}

module.exports = {
	FORBIDDEN_EXACT_NAMES,
	FORBIDDEN_SERVER_ONLY_MARKERS,
	LEGACY_BROWSER_UI_GATE_NAMES,
	envFilesForMode,
	findForbiddenClientEnvironment,
	formatFailure,
	isForbiddenClientVariable,
	parseEnvVariableNames,
	parseMode,
	run,
};
