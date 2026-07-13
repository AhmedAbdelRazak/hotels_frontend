import {
	buildPackageRoomMetadata,
	copyPackageRoomMetadata,
} from "./packageReservation";

describe("OrderTaker package room metadata", () => {
	const metadata = {
		type: "monthly",
		pkgId: "package-1",
		roomId: "room-1",
		name: "Ramadan package",
		totalSar: 4800,
		totalRootSar: 4000,
		nights: 30,
		from: "2027-02-08",
		to: "2027-03-10",
	};

	it("matches the backend package validator shape", () => {
		expect(buildPackageRoomMetadata(metadata)).toEqual({
			fromPackagesOffers: true,
			lockDates: true,
			datesLocked: true,
			packageMeta: {
				...metadata,
				usesSelectedStayDates: false,
			},
		});
	});

	it("copies the same authoritative metadata onto every flattened room", () => {
		const source = buildPackageRoomMetadata(metadata);
		const flattened = Array.from({ length: 3 }, () => ({
			count: 1,
			...copyPackageRoomMetadata(source),
		}));

		expect(flattened).toHaveLength(3);
		flattened.forEach((room) => {
			expect(room).toMatchObject(source);
			expect(room.count).toBe(1);
		});
	});

	it("does not mark ordinary rooms as package rooms", () => {
		expect(copyPackageRoomMetadata({ roomType: "double" })).toEqual({});
	});
});
