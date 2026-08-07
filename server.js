/** @format */

const express = require("express");
const compression = require("compression");
const path = require("path");
const app = express();

app.use(compression());
app.use((_req, res, next) => {
	// The admin application may embed Bank of America's hosted payment form,
	// but the application itself must not be embedded by an unrelated site.
	res.setHeader("X-Frame-Options", "SAMEORIGIN");
	res.setHeader(
		"Content-Security-Policy",
		"frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
	);
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
	next();
});
app.use(express.static(path.join(__dirname, "build")));

app.get("*", function (req, res) {
	res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.use(express.static(__dirname + "/public"));

const PORT = process.env.PORT || 3080;
// Nginx is the public edge. Keeping the static Node server on loopback avoids
// bypassing the site's TLS and security-header policy through the raw port.
const BIND_HOST =
	String(process.env.BIND_HOST || "127.0.0.1").trim() || "127.0.0.1";

app.listen(PORT, BIND_HOST, () => {
	console.log(`App is running on ${BIND_HOST}:${PORT}`);
});
