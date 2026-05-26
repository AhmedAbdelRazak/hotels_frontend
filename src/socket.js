// socket.js (frontend)
import io from "socket.io-client";

const apiUrl = process.env.REACT_APP_API_URL || "";
const socketUrl =
	process.env.REACT_APP_SOCKET_URL ||
	(apiUrl ? apiUrl.replace(/\/api\/?$/, "") : "") ||
	process.env.REACT_APP_API_URL_MAIN;

const socket = io(socketUrl, {
	autoConnect: Boolean(socketUrl),
	transports: ["polling", "websocket"],
	reconnectionAttempts: 3,
	reconnectionDelay: 1500,
	reconnectionDelayMax: 8000,
	randomizationFactor: 0.35,
	timeout: 10000,
});

socket.on("connect", () => {
	if (process.env.NODE_ENV === "development") {
		console.info("Connected to realtime server");
	}
});

socket.on("disconnect", (reason) => {
	if (process.env.NODE_ENV === "development" && reason !== "io client disconnect") {
		console.info(`Realtime server disconnected: ${reason}`);
	}
});

let hasLoggedConnectionError = false;
socket.on("connect_error", (error) => {
	if (process.env.NODE_ENV === "development" && !hasLoggedConnectionError) {
		hasLoggedConnectionError = true;
		console.warn(`Realtime server unavailable: ${error.message}`);
	}
});

socket.io.on("reconnect_failed", () => {
	if (process.env.NODE_ENV === "development") {
		console.warn("Realtime reconnect stopped after repeated failures.");
	}
});

socket.io.on("reconnect", () => {
	hasLoggedConnectionError = false;
});

export default socket;
