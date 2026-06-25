export const defaultHotelDetails = {
	hotelAmenities: ["WiFi", "Pool", "Gym"],
	hotelFloors: 0,
	overallRoomsCount: 0,
	roomCountDetails: {
		standardRooms: 0,
		standardRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		singleRooms: 0,
		singleRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		doubleRooms: 0,
		doubleRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		twinRooms: 0,
		twinRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		queenRooms: 0,
		queenRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		kingRooms: 0,
		kingRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		tripleRooms: 0,
		tripleRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		quadRooms: 0,
		quadRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		studioRooms: 0,
		studioRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		suite: 0,
		suitePrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		masterSuite: 0,
		masterSuitePrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
		familyRooms: 0,
		familyRoomsPrice: {
			basePrice: 0,
			seasonPrice: 0,
			weekendPrice: 0,
			lastMinuteDealPrice: 0,
		},
	},
	hotelRating: 3.5,
	parkingLot: true,
	hasBusService: false,
	busDetails: "",
	hasMealsService: false,
	mealsDetails: "",
	isNusuk: false,
	isNusukText: "",
	hotelPolicyQA: [
		{
			key: "cancellation_refund",
			category: "Cancellation and refunds",
			question: "What is the cancellation and refund policy?",
			answer:
				"Cancellation is free with a full refund when requested 14 days or more before check-in. When requested less than 14 days but more than 3 days before check-in, cancellation can still be processed; the hotel keeps one night only and the remaining amount is refunded. Within 3 days or less before check-in, the reservation is non-cancellable and non-refundable under the general policy.",
			mandatory: true,
			active: true,
			sortOrder: 10,
		},
	],
};

export const defaultUserValues = {
	name: "",
	email: "",
	password: "",
	password2: "",
	phone: "",
	hotelName: "",
	hotelCountry: "KSA",
	hotelState: "",
	hotelCity: "",
	hotelAddress: "",
	error: "",
	success: false,
	misMatch: false,
	redirectToReferrer: "",
	loading: false,
};

export const defaultRoomValues = {
	room_number: "000",
	room_type: "",
	room_features: [
		{
			bedSize: "Double",
			view: "city view",
			bathroom: ["bathtub", "jacuzzi"],
			airConditiong: "climate control features",
			television: "Smart TV",
			internet: ["WiFi", "Ethernet Connection"],
			Minibar: ["Refrigerator with drinks & snacks"],
			smoking: false,
		},
	],
	room_pricing: {
		basePrice: 0,
		seasonPrice: 0,
		weekendPrice: 0,
		lastMinuteDealPrice: 0,
	},
	floor: 0,
	roomColorCode: "#000",
};

export const BedSizes = ["Single", "Double", "Queen", "King", "Twin"];
export const Views = [
	"City View",
	"Sea View",
	"Garden View",
	"Mountain View",
	"Pool View",
];
export const roomTypes = [
	"standardRooms",
	"singleRooms",
	"doubleRooms",
	"twinRooms",
	"queenRooms",
	"kingRooms",
	"tripleRooms",
	"quadRooms",
	"studioRooms",
	"suite",
	"masterSuite",
	"familyRooms",
];

export const roomTypeColors = {
	standardRooms: "#003366", // Dark Blue
	singleRooms: "#8B0000", // Dark Red
	doubleRooms: "#004d00", // Dark Green
	twinRooms: "#800080", // Dark Purple
	queenRooms: "#FF8C00", // Dark Orange
	kingRooms: "#2F4F4F", // Dark Slate Gray
	tripleRooms: "#8B4513", // Saddle Brown
	quadRooms: "#00008B", // Navy
	studioRooms: "#696969", // Dim Gray
	suite: "#483D8B", // Dark Slate Blue
	masterSuite: "#556B2F", // Dark Olive Green
	familyRooms: "#A52A2A", // Brown
};
