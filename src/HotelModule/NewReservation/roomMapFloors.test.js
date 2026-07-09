import { buildRoomMapFloors, roomIsOnFloor } from "./roomMapFloors";

describe("room map floor helpers", () => {
	it("uses real room floors when hotel floor metadata is missing", () => {
		const floors = buildRoomMapFloors(
			{ hotelFloors: 0 },
			[{ floor: "3" }, { floor: 2 }, { room_number: "101" }],
		);

		expect(floors).toEqual([1, 2, 3]);
	});

	it("falls back to configured hotel floors before rooms load", () => {
		expect(buildRoomMapFloors({ hotelFloors: 3 }, [])).toEqual([1, 2, 3]);
	});

	it("matches numeric and string room floors consistently", () => {
		expect(roomIsOnFloor({ floor: "2" }, 2)).toBe(true);
		expect(roomIsOnFloor({ floor: 4 }, "4")).toBe(true);
		expect(roomIsOnFloor({ floor: 4 }, 3)).toBe(false);
	});
});
