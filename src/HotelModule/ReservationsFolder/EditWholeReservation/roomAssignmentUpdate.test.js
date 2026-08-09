import {
	areSameRoomAssignments,
	buildRoomAssignmentSavePayload,
	buildSearchedReservationUpdate,
	mergePersistedRoomAssignment,
	mergeUpdatedReservationIntoList,
	normalizeRoomAssignmentIds,
	resolveRoomAssignmentSelection,
	roomAssignmentOptionMatchesSearch,
	shouldStageMultiRoomReplacement,
	withExplicitRoomAssignmentIntent,
} from "./roomAssignmentUpdate";
import fs from "fs";
import path from "path";

test("normalizes populated room records and Ant Design label values", () => {
	expect(
		normalizeRoomAssignmentIds([
			{ _id: "room-419" },
			{ id: "room-606" },
			{ value: "room-301", label: "301" },
		]),
	).toEqual(["room-419", "room-606", "room-301"]);
});

test("finds a physical room by its visible room number instead of its database id", () => {
	const option = {
		value: "6a4e15b4ee33f79097e35d8b",
		label: "419 | Spacious Six-Bed Room",
	};

	expect(roomAssignmentOptionMatchesSearch("41", option)).toBe(true);
	expect(roomAssignmentOptionMatchesSearch("spacious six-bed", option)).toBe(
		true,
	);
	expect(roomAssignmentOptionMatchesSearch("606", option)).toBe(false);
});

test("keeps room search available when the search field is blank", () => {
	expect(
		roomAssignmentOptionMatchesSearch("   ", {
			value: "room-419",
			label: "419 | Spacious Six-Bed Room",
		}),
	).toBe(true);
});

test("treats a reordered selection as the same physical-room assignment", () => {
	expect(
		areSameRoomAssignments(
			[{ _id: "room-419" }, { _id: "room-606" }],
			["room-606", "room-419"],
		),
	).toBe(true);
});

test("turns an unambiguous one-room append into a replacement", () => {
	expect(
		resolveRoomAssignmentSelection({
			currentRooms: [{ _id: "room-606" }],
			nextRooms: [
				{ value: "room-606", label: "606" },
				{ value: "room-419", label: "419" },
			],
			requestedRoomCount: 1,
		}),
	).toEqual({ roomIds: ["room-419"], blocked: false, replaced: true });
});

test("keeps an explicit one-room clear available for confirmation", () => {
	expect(
		resolveRoomAssignmentSelection({
			currentRooms: ["room-606"],
			nextRooms: [],
			requestedRoomCount: 1,
		}),
	).toEqual({ roomIds: [], blocked: false, replaced: false });
});

test("blocks an ambiguous over-capacity multi-room selection", () => {
	expect(
		resolveRoomAssignmentSelection({
			currentRooms: ["room-301", "room-302"],
			nextRooms: ["room-301", "room-302", "room-303"],
			requestedRoomCount: 2,
		}),
	).toEqual({
		roomIds: ["room-301", "room-302"],
		blocked: true,
		replaced: false,
	});
});

test("allows a legacy over-capacity assignment to be reduced safely", () => {
	expect(
		resolveRoomAssignmentSelection({
			currentRooms: ["room-301", "room-302", "room-303"],
			nextRooms: ["room-301", "room-302"],
			requestedRoomCount: 1,
		}),
	).toEqual({
		roomIds: ["room-301", "room-302"],
		blocked: false,
		replaced: false,
	});
});

test("does not infer a room limit when the booked count is unavailable", () => {
	expect(
		resolveRoomAssignmentSelection({
			currentRooms: ["room-606"],
			nextRooms: ["room-606", "room-419"],
			requestedRoomCount: 0,
		}),
	).toEqual({
		roomIds: ["room-606", "room-419"],
		blocked: false,
		replaced: false,
	});
});

test("refreshes the changed reservation in a heat-map list without losing projection fields", () => {
	const unchanged = { _id: "reservation-2", roomId: ["room-301"] };
	const result = mergeUpdatedReservationIntoList(
		[
			{
				_id: "reservation-1",
				roomId: ["room-419"],
				customer_details: { name: "Guest" },
			},
			unchanged,
		],
		{ _id: "reservation-1", roomId: ["room-606"] },
	);

	expect(result[0]).toEqual({
		_id: "reservation-1",
		roomId: ["room-606"],
		customer_details: { name: "Guest" },
	});
	expect(result[1]).toBe(unchanged);
});

test("leaves ordinary reservation updates without room-assignment intent", () => {
	const updateData = { comment: "Late arrival" };
	const result = withExplicitRoomAssignmentIntent(
		updateData,
		["room-419", "room-606"],
		["room-606", "room-419"],
	);

	expect(result).toBe(updateData);
	expect(result).not.toHaveProperty("roomId");
	expect(result).not.toHaveProperty("__roomAssignmentUpdateIntent");
});

test("marks a confirmed physical-room replacement as explicit", () => {
	const updateData = { comment: "Guest requested another room" };
	const result = withExplicitRoomAssignmentIntent(
		updateData,
		["room-419"],
		[{ value: "room-606", label: "606" }],
	);

	expect(result).toEqual({
		comment: "Guest requested another room",
		roomId: ["room-606"],
		__roomAssignmentUpdateIntent: true,
	});
	expect(updateData).toEqual({ comment: "Guest requested another room" });
});

test("marks an explicitly confirmed room clear without losing other fields", () => {
	expect(
		withExplicitRoomAssignmentIntent({ sendEmail: false }, ["room-419"], []),
	).toEqual({
		sendEmail: false,
		roomId: [],
		__roomAssignmentUpdateIntent: true,
	});
});

test("uses a minimal patch for a room move after the guest is already housed", () => {
	const originalCheckIn = new Date("2026-08-08T07:18:54.755Z");
	const result = buildSearchedReservationUpdate({
		reservation: {
			reservation_status: "InHouse",
			roomId: [{ _id: "room-419" }],
		},
		nextRooms: ["room-606"],
		requestingUserId: "operator-1",
		inhouseAt: new Date("2026-08-09T08:10:00.000Z"),
		checkInUpdate: {
			reservation_status: "InHouse",
			total_rooms: 1,
			bedNumber: [],
			housedBy: { _id: "operator-1" },
			inhouse_date: originalCheckIn,
			total_amount: 150,
		},
	});

	expect(result).toEqual({
		requestingUserId: "operator-1",
		roomId: ["room-606"],
		__roomAssignmentUpdateIntent: true,
	});
});

test("does not submit a second check-in update when an in-house room is unchanged", () => {
	expect(
		buildSearchedReservationUpdate({
			reservation: {
				reservation_status: "in house",
				roomId: [{ _id: "room-419" }],
			},
			nextRooms: ["room-419"],
			checkInUpdate: { housedBy: { _id: "operator-2" } },
		}),
	).toBeNull();
});

test("keeps the full lifecycle payload for an initial check-in", () => {
	const inhouseAt = new Date("2026-08-09T08:10:00.000Z");
	expect(
		buildSearchedReservationUpdate({
			reservation: {
				reservation_status: "Confirmed",
				roomId: ["room-419"],
			},
			nextRooms: ["room-606"],
			requestingUserId: "operator-1",
			inhouseAt,
			checkInUpdate: {
				reservation_status: "InHouse",
				housedBy: { _id: "operator-1" },
				bedNumber: [],
			},
		}),
	).toEqual({
		reservation_status: "InHouse",
		housedBy: { _id: "operator-1" },
		bedNumber: [],
		inhouse_date: inhouseAt,
		requestingUserId: "operator-1",
		roomId: ["room-606"],
		__roomAssignmentUpdateIntent: true,
	});
});

test("retains the same preassigned room during initial check-in side effects", () => {
	const inhouseAt = new Date("2026-08-09T08:10:00.000Z");
	expect(
		buildSearchedReservationUpdate({
			reservation: {
				reservation_status: "Confirmed",
				roomId: [{ _id: "room-419" }],
			},
			nextRooms: ["room-419"],
			inhouseAt,
			checkInUpdate: { reservation_status: "InHouse" },
		}),
	).toEqual({
		reservation_status: "InHouse",
		roomId: ["room-419"],
		inhouse_date: inhouseAt,
	});
});

test.each([
	["EditReservationMain.js", /withExplicitRoomAssignmentIntent\(/],
	[
		"../../NewReservation/NewReservationMain.js",
		/buildSearchedReservationUpdate\(/,
	],
])("%s applies the explicit room-assignment contract", (file, contract) => {
	const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
	expect(source).toMatch(contract);
});

test("the searched-reservation flow guards duplicate submissions", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "../../NewReservation/NewReservationMain.js"),
		"utf8",
	);
	expect(source).toMatch(/if \(reservationSubmitInFlightRef\.current\) return;/);
	expect(source).toMatch(/reservationSubmitInFlightRef\.current = true;/);
});

test("the modal closes the room popup before showing a higher confirmation layer", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "EditReservationMain.js"),
		"utf8",
	);
	expect(source).toMatch(/setIsRoomSelectOpen\(false\);[\s\S]*setPendingRoomIds/);
	expect(source).toMatch(/open=\{isRoomSelectOpen\}/);
	expect(source).toMatch(/onDropdownVisibleChange=\{setIsRoomSelectOpen\}/);
	expect(source).toMatch(
		/childModalProps\(100, "hotel-edit-reservation-confirm-modal"\)/,
	);
	const appStyles = fs.readFileSync(
		path.resolve(__dirname, "../../../App.css"),
		"utf8",
	);
	expect(appStyles).toMatch(
		/hotel-edit-reservation-confirm-modal[\s\S]*z-index:\s*19100\s*!important/,
	);
});

test("stages one removal from a complete multi-room assignment", () => {
	expect(
		shouldStageMultiRoomReplacement({
			persistedRooms: ["room-301", "room-302"],
			currentRooms: ["room-301", "room-302"],
			nextRooms: ["room-302"],
			requestedRoomCount: 2,
		}),
	).toBe(true);
	expect(
		buildRoomAssignmentSavePayload(
			["room-301", "room-302"],
			["room-302", "room-303"],
		),
	).toEqual({
		roomId: ["room-302", "room-303"],
		__roomAssignmentUpdateIntent: true,
	});

	for (const scenario of [
		{
			persistedRooms: ["room-301"],
			currentRooms: ["room-301"],
			nextRooms: [],
			requestedRoomCount: 1,
		},
		{
			persistedRooms: ["room-301", "room-302"],
			currentRooms: ["room-302"],
			nextRooms: [],
			requestedRoomCount: 2,
		},
		{
			persistedRooms: ["room-301"],
			currentRooms: ["room-301"],
			nextRooms: [],
			requestedRoomCount: 2,
		},
	]) {
		expect(shouldStageMultiRoomReplacement(scenario)).toBe(false);
	}
});

test("the modal confirmation saves the room immediately through the strict endpoint", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "EditReservationMain.js"),
		"utf8",
	);
	const handler = source.match(
		/const handleConfirmRoomChange = async \(\) => \{([\s\S]*?)\n\t\};\n\tconst handleCancelRoomChange/,
	)?.[1];

	expect(handler).toBeTruthy();
	expect(handler).toMatch(/if \(isSaving \|\| savingRef\.current\) return;/);
	expect(handler).toMatch(/savingRef\.current = true;/);
	expect(handler).toMatch(/buildRoomAssignmentSavePayload\(/);
	expect(handler).toMatch(/updateHotelManagementReservation\(/);
	expect(handler).toMatch(/onRoomAssignmentSaved\(updatedReservation\)/);
	expect(handler).toMatch(/responseHasHttpStatus/);
	expect(handler).toMatch(/Reload the reservation before retrying/);
	expect(handler).toMatch(
		/Object\.prototype\.hasOwnProperty\.call\(updatedReservation, "roomId"\)/,
	);
	expect(source).toMatch(/confirmLoading=\{isSaving\}/);
	expect(source).toMatch(/okText=.*"Save Room"/);
});

test("the modal stages multi-room replacement without an intermediate save", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "EditReservationMain.js"),
		"utf8",
	);
	expect(source).toMatch(/shouldStageMultiRoomReplacement\(\{/);
	expect(source).toMatch(/setHasStagedMultiRoomReplacement\(true\)/);
	expect(source).toMatch(/nothing has been saved yet/);
	expect(source).toMatch(
		/if \(hasStagedMultiRoomReplacement\) \{[\s\S]*Finish selecting the replacement room/,
	);
});

test("builds an exact room-only save payload and skips unchanged assignments", () => {
	expect(
		buildRoomAssignmentSavePayload(["room-606"], [
			{ value: "room-419", label: "419" },
		]),
	).toEqual({
		roomId: ["room-419"],
		__roomAssignmentUpdateIntent: true,
	});
	expect(
		buildRoomAssignmentSavePayload(
			["room-606", "room-419"],
			["room-419", "room-606"],
		),
	).toBeNull();
});

test("refreshes persisted room metadata without discarding other draft edits", () => {
	const draft = {
		_id: "reservation-1",
		roomId: ["room-606"],
		customer_details: { name: "Unsaved corrected name" },
		comment: "Unsaved late arrival note",
		__v: 11,
		updatedAt: "before",
	};
	const persisted = {
		_id: "reservation-1",
		roomId: [{ _id: "room-419", room_number: "419" }],
		customer_details: { name: "Original name" },
		comment: "Original note",
		__v: 12,
		updatedAt: "after",
	};

	expect(mergePersistedRoomAssignment(draft, persisted)).toEqual({
		...draft,
		roomId: persisted.roomId,
		__v: 12,
		updatedAt: "after",
	});
	expect(draft.roomId).toEqual(["room-606"]);
});

test("the modal room selector searches its visible labels", () => {
	const source = fs.readFileSync(
		path.resolve(__dirname, "EditReservationMain.js"),
		"utf8",
	);
	const roomAssignmentSelector = source.match(
		/"Room Assignment"\}[\s\S]*?<Select[\s\S]*?<\/Select>/,
	)?.[0];

	expect(roomAssignmentSelector).toBeTruthy();
	expect(roomAssignmentSelector).toMatch(/showSearch/);
	expect(roomAssignmentSelector).toMatch(/optionFilterProp='label'/);
	expect(roomAssignmentSelector).toMatch(
		/filterOption=\{roomAssignmentOptionMatchesSearch\}/,
	);
});
