import fs from "fs";
import path from "path";

test("the production frontend origin is loopback-bound by default", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "../server.js"),
		"utf8"
	);

	expect(source).toMatch(
		/process\.env\.BIND_HOST\s*\|\|\s*"127\.0\.0\.1"/
	);
	expect(source).toMatch(/app\.listen\(PORT, BIND_HOST,/);
});
