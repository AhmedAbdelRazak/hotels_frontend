// NotificationContext.js
import React, { createContext, useRef, useState, useEffect } from "react";
import notificationSound from "./Notification.wav"; // Adjust path as needed

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
	const [soundEnabled, setSoundEnabled] = useState(false);
	const audioRef = useRef(null);

	useEffect(() => {
		audioRef.current = new Audio(notificationSound);
	}, []);

	// This function is invoked by a user gesture to "unlock" the audio
	const enableSound = async () => {
		if (!audioRef.current) return;
		try {
			await audioRef.current.play();
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			setSoundEnabled(true);
			console.log("Notification sound enabled");
		} catch (err) {
			console.error("Error enabling sound:", err);
		}
	};

	// Actually play the sound each time a new message arrives (only if enabled)
	const playSound = () => {
		if (!soundEnabled || !audioRef.current) return;
		audioRef.current.play().catch((err) => {
			console.log("Audio blocked or error playing:", err);
		});
	};

	return (
		<NotificationContext.Provider
			value={{ soundEnabled, enableSound, playSound }}
		>
			{children}
		</NotificationContext.Provider>
	);
};
