// NotificationContext.js
import React, {
	createContext,
	useCallback,
	useRef,
	useState,
	useEffect,
} from "react";
import notificationSound from "./Notification.wav"; // Adjust path as needed

export const NotificationContext = createContext();
const SOUND_STORAGE_KEY = "xhotelproNotificationSoundEnabled";

export const NotificationProvider = ({ children }) => {
	const [soundEnabled, setSoundEnabled] = useState(() => {
		if (typeof window === "undefined") return false;
		return window.localStorage.getItem(SOUND_STORAGE_KEY) === "true";
	});
	const [audioUnlocked, setAudioUnlocked] = useState(false);
	const audioRef = useRef(null);

	useEffect(() => {
		audioRef.current = new Audio(notificationSound);
		audioRef.current.preload = "auto";
	}, []);

	const unlockAudio = useCallback(async ({ audible = false } = {}) => {
		const audio = audioRef.current;
		if (!audio) return false;

		try {
			const previousVolume = audio.volume;
			if (!audible) audio.volume = 0;
			audio.currentTime = 0;
			await audio.play();
			audio.pause();
			audio.currentTime = 0;
			audio.volume = previousVolume;
			setAudioUnlocked(true);
			return true;
		} catch (err) {
			setAudioUnlocked(false);
			console.error("Error unlocking notification sound:", err);
			return false;
		}
	}, []);

	// This function is invoked by a user gesture to enable and unlock audio.
	const enableSound = async () => {
		const unlocked = await unlockAudio({ audible: true });
		if (unlocked) {
			setSoundEnabled(true);
			window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
			console.log("Notification sound enabled");
		}
	};

	// Browsers can require a fresh user gesture after every page load even when
	// localStorage says sound was enabled before.
	useEffect(() => {
		if (!soundEnabled || audioUnlocked || typeof window === "undefined") return;

		const unlockFromGesture = () => {
			unlockAudio({ audible: false });
		};

		window.addEventListener("pointerdown", unlockFromGesture, { passive: true });
		window.addEventListener("touchstart", unlockFromGesture, { passive: true });
		window.addEventListener("keydown", unlockFromGesture);

		return () => {
			window.removeEventListener("pointerdown", unlockFromGesture);
			window.removeEventListener("touchstart", unlockFromGesture);
			window.removeEventListener("keydown", unlockFromGesture);
		};
	}, [audioUnlocked, soundEnabled, unlockAudio]);

	// Actually play the sound each time a new message arrives (only if enabled)
	const playSound = () => {
		if (!soundEnabled || !audioRef.current) return;
		audioRef.current.currentTime = 0;
		audioRef.current
			.play()
			.then(() => setAudioUnlocked(true))
			.catch((err) => {
				setAudioUnlocked(false);
				console.log("Audio blocked or error playing:", err);
			});
	};

	return (
		<NotificationContext.Provider
			value={{
				soundEnabled,
				audioUnlocked,
				soundNeedsUnlock: soundEnabled && !audioUnlocked,
				enableSound,
				playSound,
			}}
		>
			{children}
		</NotificationContext.Provider>
	);
};
