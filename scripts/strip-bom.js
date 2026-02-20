"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");

const hasUtf8Bom = (buffer) =>
	buffer.length >= 3 &&
	buffer[0] === 0xef &&
	buffer[1] === 0xbb &&
	buffer[2] === 0xbf;

const walk = (dir) => {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	let files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files = files.concat(walk(fullPath));
		} else if (entry.isFile()) {
			files.push(fullPath);
		}
	}
	return files;
};

const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".json", ".css"]);
const allFiles = walk(srcDir).filter((filePath) =>
	textExtensions.has(path.extname(filePath).toLowerCase()),
);

let changed = 0;
for (const filePath of allFiles) {
	const bytes = fs.readFileSync(filePath);
	if (!hasUtf8Bom(bytes)) continue;
	fs.writeFileSync(filePath, bytes.slice(3));
	changed += 1;
	console.log(`Removed BOM: ${path.relative(rootDir, filePath)}`);
}

if (changed === 0) {
	console.log("No UTF-8 BOM found.");
} else {
	console.log(`Removed BOM from ${changed} file(s).`);
}
