"use strict";

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const SERVER_CREDENTIAL_NAME =
	/(?:HOTELRUNNER_API_(?:TOKEN|HR_ID)|SECRET|TOKEN|PASSWORD|PASSCODE|PRIVATE_KEY|MONGODB|DATABASE_URL|JWT|SENDGRID|OPENAI|TWILIO|ACCESS_KEY)/i;
const SCANNED_FILE = /\.(?:css|html|js|json|map|txt)$/i;

const assertRegularPath = (target, expectedType) => {
	const resolved = path.resolve(String(target || ""));
	if (!target || resolved === path.parse(resolved).root) {
		throw new Error(`A safe explicit ${expectedType} path is required.`);
	}
	const stat = fs.lstatSync(resolved);
	if (stat.isSymbolicLink()) {
		throw new Error(`The explicit ${expectedType} path cannot be a symbolic link.`);
	}
	if (expectedType === "server env" && !stat.isFile()) {
		throw new Error("The explicit server env path must be a regular file.");
	}
	if (expectedType === "build directory" && !stat.isDirectory()) {
		throw new Error("The explicit build path must be a directory.");
	}
	return resolved;
};

const buildFiles = (directory) => {
	const files = [];
	const visit = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const fullPath = path.join(current, entry.name);
			if (entry.isSymbolicLink()) {
				throw new Error("The build directory cannot contain symbolic links.");
			}
			if (entry.isDirectory()) visit(fullPath);
			else if (entry.isFile() && SCANNED_FILE.test(entry.name)) files.push(fullPath);
		}
	};
	visit(directory);
	return files;
};

const sensitiveServerValues = (envText) =>
	Object.entries(dotenv.parse(Buffer.from(envText)))
		.filter(
			([name, value]) =>
				SERVER_CREDENTIAL_NAME.test(name) && String(value || "").length >= 8
		)
		.map(([name, value]) => ({ name, value: String(value) }));

const scanBuildForServerValues = ({ serverEnvPath, buildDirectory }) => {
	const safeEnv = assertRegularPath(serverEnvPath, "server env");
	const safeBuild = assertRegularPath(buildDirectory, "build directory");
	const credentials = sensitiveServerValues(fs.readFileSync(safeEnv));
	const files = buildFiles(safeBuild);
	const matchedNames = new Set();

	for (const file of files) {
		const contents = fs.readFileSync(file);
		for (const credential of credentials) {
			if (contents.includes(Buffer.from(credential.value))) {
				matchedNames.add(credential.name);
			}
		}
	}

	if (matchedNames.size > 0) {
		throw new Error(
			`Production build contains backend credential values for: ${[
				...matchedNames,
			]
				.sort()
				.join(", ")}. No values were logged.`
		);
	}

	return {
		credentialValueCount: credentials.length,
		scannedFileCount: files.length,
	};
};

const parseArguments = (argv) => {
	const args = [...argv];
	const options = { serverEnvPath: "", buildDirectory: "" };
	while (args.length) {
		const flag = args.shift();
		const value = args.shift();
		if (!value || value.startsWith("--")) {
			throw new Error(`${flag || "Option"} requires an explicit path.`);
		}
		if (flag === "--server-env") options.serverEnvPath = value;
		else if (flag === "--build-dir") options.buildDirectory = value;
		else throw new Error("Unsupported build-audit option.");
	}
	if (!options.serverEnvPath || !options.buildDirectory) {
		throw new Error("Both --server-env and --build-dir are required.");
	}
	return options;
};

if (require.main === module) {
	try {
		const result = scanBuildForServerValues(
			parseArguments(process.argv.slice(2))
		);
		console.log(
			`Production build server-value audit passed (${result.scannedFileCount} files; ${result.credentialValueCount} protected values).`
		);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}

module.exports = {
	buildFiles,
	parseArguments,
	scanBuildForServerValues,
	sensitiveServerValues,
};
