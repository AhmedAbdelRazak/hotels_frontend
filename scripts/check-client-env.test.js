"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
	envFilesForMode,
	findForbiddenClientEnvironment,
	formatFailure,
	isForbiddenClientVariable,
	parseEnvVariableNames,
	run,
} = require("./check-client-env");

const withTempDirectory = (callback) => {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), "client-env-check-"));
	try {
		return callback(directory);
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
};

test("parses variable names without returning values", () => {
	const marker = "fake-sensitive-value-that-must-not-be-reported";
	const names = parseEnvVariableNames(
		`\uFEFFREACT_APP_API_URL=https://example.test\n# comment\nexport REACT_APP_ACCESS_TOKEN=${marker}\ninvalid line`,
	);

	assert.deepEqual(names, ["REACT_APP_API_URL", "REACT_APP_ACCESS_TOKEN"]);
	assert.equal(JSON.stringify(names).includes(marker), false);
});

test("blocks known and future server-only credential names", () => {
	for (const name of [
		"REACT_APP_HOTEL_RUNNER_TOKEN",
		"REACT_APP_HOTEL_RUNNER_API_KEY",
		"REACT_APP_HOTELRUNNER_API_KEY",
		"REACT_APP_HOTEL_RUNNER_KEY",
		"REACT_APP_HOTELRUNNER_KEY",
		"REACT_APP_HR_API_KEY",
		"REACT_APP_HR_KEY",
		"REACT_APP_HR_ID",
		"REACT_APP_GOOGLE_CLIENT_SECRET",
		"REACT_APP_SECRET_KEY",
		"REACT_APP_ACCESS_TOKEN",
		"REACT_APP_STRIPE_SECRET_KEY",
		"REACT_APP_STRIPE_SECRET_KEY_LIVE",
		"REACT_APP_GOOGLE_CLIENT_SECRET_JSON",
		"REACT_APP_SQUARE_ACCESS_TOKEN",
		"REACT_APP_BACKEND_SIGNING_KEY",
		"REACT_APP_DATABASE_URL",
		"REACT_APP_JWT_SECRET",
		"REACT_APP_ADMIN_PASSWORD_HASH",
		"REACT_APP_SUPPORT_PASSCODE_V2",
	]) {
		assert.equal(isForbiddenClientVariable(name), true, name);
	}
});

test("allows browser-public identifiers and restricted public keys", () => {
	for (const name of [
		"REACT_APP_API_URL",
		"REACT_APP_GOOGLE_CLIENT_ID",
		"REACT_APP_MAPS_API_KEY",
		"REACT_APP_PAYPAL_CLIENT_ID_LIVE",
		"REACT_APP_PUBLISHABLE_KEY",
	]) {
		assert.equal(isForbiddenClientVariable(name), false, name);
	}
});

test("uses the same dotenv file families Create React App loads", () => {
	assert.deepEqual(envFilesForMode("production"), [
		".env.production.local",
		".env.local",
		".env.production",
		".env",
	]);
	assert.deepEqual(envFilesForMode("test"), [
		".env.test.local",
		".env.test",
		".env",
	]);
});

test("finds forbidden names in loaded files and inherited environment", () => {
	withTempDirectory((rootDir) => {
		fs.writeFileSync(
			path.join(rootDir, ".env"),
			"REACT_APP_API_URL=https://example.test\nREACT_APP_SECRET_KEY=fake-one\n",
		);
		fs.writeFileSync(
			path.join(rootDir, ".env.production"),
			"REACT_APP_HOTEL_RUNNER_TOKEN=fake-two\n",
		);

		assert.deepEqual(
			findForbiddenClientEnvironment({
				rootDir,
				mode: "production",
				inheritedEnvironment: { REACT_APP_ACCESS_TOKEN: "fake-three" },
			}),
			[
				{
					source: ".env.production",
					names: ["REACT_APP_HOTEL_RUNNER_TOKEN"],
				},
				{ source: ".env", names: ["REACT_APP_SECRET_KEY"] },
				{
					source: "process environment",
					names: ["REACT_APP_ACCESS_TOKEN"],
				},
			],
		);
	});
});

test("failure output reports names and never credential values", () => {
	const marker = "fake-sensitive-value-that-must-not-be-reported";
	const output = formatFailure(
		[{ source: ".env", names: ["REACT_APP_SECRET_KEY"] }],
		"production",
	);

	assert.match(output, /REACT_APP_SECRET_KEY/u);
	assert.equal(output.includes(marker), false);
	assert.match(output, /No environment values were logged\./u);
});

test("allows only the exact legacy browser UI gate names", () => {
	for (const name of [
		"REACT_APP_REPORTS",
		"REACT_APP_CUSTOMER_SERVICE",
		"REACT_APP_INTEGRATOR_PASSWORD",
		"REACT_APP_PASSCODE",
	]) {
		assert.equal(isForbiddenClientVariable(name), false, name);
	}

	for (const name of [
		"REACT_APP_REPORTS_PASSWORD",
		"REACT_APP_INTEGRATOR_PASSWORD_V2",
		"REACT_APP_CUSTOMER_SERVICE_PASSCODE",
		"REACT_APP_PASSCODE_V2",
	]) {
		assert.equal(isForbiddenClientVariable(name), true, name);
	}
});

test("legacy browser UI gates do not block the existing production build", () => {
	const marker = "legacy-password-value-that-must-stay-secret";
	withTempDirectory((rootDir) => {
		fs.writeFileSync(
			path.join(rootDir, ".env"),
			[
				`REACT_APP_REPORTS=${marker}`,
				`REACT_APP_CUSTOMER_SERVICE=${marker}`,
				`REACT_APP_INTEGRATOR_PASSWORD=${marker}`,
				`REACT_APP_PASSCODE=${marker}`,
			].join("\n"),
		);

		assert.deepEqual(
			findForbiddenClientEnvironment({
				rootDir,
				mode: "production",
				inheritedEnvironment: {},
			}),
			[],
		);
		assert.equal(
			run({ rootDir, mode: "production", inheritedEnvironment: {} }),
			"Client environment security check passed for production.",
		);
	});
});

test("passes when only browser-safe names are present", () => {
	withTempDirectory((rootDir) => {
		fs.writeFileSync(
			path.join(rootDir, ".env"),
			"REACT_APP_API_URL=https://example.test\nREACT_APP_GOOGLE_CLIENT_ID=public-id\n",
		);

		assert.equal(
			run({ rootDir, mode: "production", inheritedEnvironment: {} }),
			"Client environment security check passed for production.",
		);
	});
});
