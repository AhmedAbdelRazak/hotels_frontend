"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
	parseArguments,
	scanBuildForServerValues,
	sensitiveServerValues,
} = require("./check-build-server-values");

const withFixture = (callback) => {
	const directory = fs.mkdtempSync(
		path.join(os.tmpdir(), "client-build-secret-check-")
	);
	try {
		const envPath = path.join(directory, "server.env");
		const buildDirectory = path.join(directory, "build");
		fs.mkdirSync(buildDirectory);
		return callback({ directory, envPath, buildDirectory });
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
};

test("selects server credentials without returning unrelated public values", () => {
	const values = sensitiveServerValues(
		"HOTELRUNNER_API_TOKEN=synthetic-secret-token\n" +
			"HOTELRUNNER_API_HR_ID=synthetic-partner-id\n" +
			"HOTELRUNNER_SUPPORTED_HOTELIDS=public-local-hotel-id\n" +
			"PUBLIC_URL=/app\nSHORT_TOKEN=x\n"
	);
	assert.deepEqual(values, [
		{ name: "HOTELRUNNER_API_TOKEN", value: "synthetic-secret-token" },
		{ name: "HOTELRUNNER_API_HR_ID", value: "synthetic-partner-id" },
	]);
});

test("fails with names only when a backend value is present in the build", () => {
	withFixture(({ envPath, buildDirectory }) => {
		const secret = "synthetic-server-secret-never-report";
		fs.writeFileSync(
			envPath,
			`HOTELRUNNER_API_TOKEN=${secret}\nHOTELRUNNER_API_HR_ID=synthetic-hr-id\n`
		);
		fs.writeFileSync(
			path.join(buildDirectory, "main.js"),
			`window.__bad = ${JSON.stringify(secret)};`
		);

		assert.throws(
			() => scanBuildForServerValues({ serverEnvPath: envPath, buildDirectory }),
			(error) =>
				error.message.includes("HOTELRUNNER_API_TOKEN") &&
				!error.message.includes(secret) &&
				error.message.includes("No values were logged")
		);
	});
});

test("passes a clean build and requires both explicit paths", () => {
	withFixture(({ envPath, buildDirectory }) => {
		fs.writeFileSync(
			envPath,
			"HOTELRUNNER_API_TOKEN=synthetic-secret-token\n"
		);
		fs.mkdirSync(path.join(buildDirectory, "static"));
		fs.writeFileSync(path.join(buildDirectory, "index.html"), "<html></html>");
		fs.writeFileSync(path.join(buildDirectory, "static", "main.js"), "safe");

		assert.deepEqual(
			scanBuildForServerValues({ serverEnvPath: envPath, buildDirectory }),
			{ credentialValueCount: 1, scannedFileCount: 2 }
		);
	});

	assert.throws(() => parseArguments([]), /Both --server-env and --build-dir/);
});
