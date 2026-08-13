import fs from "fs";
import path from "path";

const readSource = (...segments) =>
	fs.readFileSync(path.resolve(__dirname, ...segments), "utf8");

describe("retired HotelRunner admin integration", () => {
	test("does not expose the retired route or sidebar entry", () => {
		const retiredRoute = ["/admin", "/hotelrunner"].join("");
		const appSource = readSource("App.js");
		const adminRouteSource = readSource("auth", "AdminRoute.js");
		const navSources = [
			readSource("AdminModule", "AdminNavbar", "AdminNavbar.js"),
			readSource("AdminModule", "AdminNavbar", "AdminNavbarArabic.js"),
		];

		expect(appSource).not.toContain(retiredRoute);
		expect(adminRouteSource).not.toContain(retiredRoute);
		for (const navSource of navSources) {
			expect(navSource).not.toContain(retiredRoute);
		}
	});

	test("removes the dedicated integration page and API client", () => {
		const integrationDirectory = path.resolve(
			__dirname,
			"AdminModule",
			["Hotel", "Runner"].join("")
		);
		const retiredFiles = [
			"HotelRunnerMain.js",
			"hotelRunnerApi.js",
			"hotelRunnerViewModel.js",
		];

		for (const retiredFile of retiredFiles) {
			expect(fs.existsSync(path.join(integrationDirectory, retiredFile))).toBe(
				false
			);
		}
	});
});
