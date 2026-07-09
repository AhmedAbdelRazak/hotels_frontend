const normalizePositiveInteger = (value) => {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return null;
	return Math.floor(parsed);
};

export const getRoomFloor = (room = {}) =>
	normalizePositiveInteger(room?.floor) || 1;

const getConfiguredFloors = (hotelDetails = {}) => {
	const floorCount = normalizePositiveInteger(hotelDetails?.hotelFloors) || 0;
	return Array.from({ length: floorCount }, (_, index) => index + 1);
};

const uniqueSortedFloors = (floors = []) =>
	Array.from(new Set(floors.filter((floor) => floor > 0))).sort(
		(first, second) => first - second,
	);

export const buildRoomMapFloors = (hotelDetails = {}, hotelRooms = []) => {
	const rooms = Array.isArray(hotelRooms) ? hotelRooms : [];
	const roomFloors = uniqueSortedFloors(rooms.map(getRoomFloor));
	if (roomFloors.length > 0) return roomFloors;
	return getConfiguredFloors(hotelDetails);
};

export const roomIsOnFloor = (room = {}, floor) => {
	const normalizedFloor = normalizePositiveInteger(floor);
	if (!normalizedFloor) return false;
	return getRoomFloor(room) === normalizedFloor;
};
