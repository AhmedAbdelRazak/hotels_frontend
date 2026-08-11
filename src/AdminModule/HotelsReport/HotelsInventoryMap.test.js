import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useHistory, useLocation } from "react-router-dom";
import { isAuthenticated } from "../../auth";
import {
	distinctBookingSources,
	getBookingSourcePaymentSummary,
	getCheckoutDatePaymentSummary,
	getHotelOccupancyCalendar,
	gettingHotelDetailsForAdmin,
} from "../apiAdmin";
import HotelsInventoryMap from "./HotelsInventoryMap";

jest.mock("../../auth", () => ({ isAuthenticated: jest.fn() }));

jest.mock("../apiAdmin", () => ({
	distinctBookingSources: jest.fn(),
	getBookingSourcePaymentSummary: jest.fn(),
	getCheckoutDatePaymentSummary: jest.fn(),
	getHotelOccupancyCalendar: jest.fn(),
	getHotelOccupancyDayReservations: jest.fn(),
	getHotelOccupancyWarnings: jest.fn(),
	getSpecificListOfReservations: jest.fn(),
	gettingHotelDetailsForAdmin: jest.fn(),
}));

jest.mock("../../HotelModule/apiAdmin", () => ({
	singlePreReservationById: jest.fn(),
}));

jest.mock("../AllReservation/EnhancedContentTable", () => () => null);
jest.mock("../../HotelModule/ReservationsFolder/ReservationDetail", () => () => null);
jest.mock("../AllReservation/MoreDetails", () => () => null);
jest.mock("./WarningsModal", () => () => null);

jest.mock("../../utils/saudiDates", () => ({
	formatSaudiGregorianDate: (value) => String(value || "").slice(0, 10),
	formatSaudiHijriDate: () => "",
}));

jest.mock("@ant-design/icons", () => {
	const React = require("react");
	const Icon = () => <span aria-hidden='true' />;
	return {
		ApartmentOutlined: Icon,
		BankOutlined: Icon,
		BarChartOutlined: Icon,
		CalendarOutlined: Icon,
		CheckCircleOutlined: Icon,
		CreditCardOutlined: Icon,
		DatabaseOutlined: Icon,
		DollarCircleOutlined: Icon,
		FilterOutlined: Icon,
		FundOutlined: Icon,
		LoginOutlined: Icon,
		ProfileOutlined: Icon,
		TagsOutlined: Icon,
		WarningOutlined: Icon,
	};
});

jest.mock("antd", () => {
	const React = require("react");
	const Button = React.forwardRef(
		(
			{
				children,
				onClick,
				disabled,
				className,
				style,
				isActive,
				type,
				...rest
			},
			ref,
		) => (
			<button
				ref={ref}
				type='button'
				onClick={onClick}
				disabled={disabled}
				className={className}
				style={style}
				{...rest}
			>
				{children}
			</button>
		),
	);
	const Option = ({ value, children }) => <option value={value}>{children}</option>;
	const Select = ({
		children,
		value,
		onChange,
		disabled,
		className,
		style,
		mode,
		placeholder,
		"aria-label": ariaLabel,
	}) => (
		<select
			value={value}
			onChange={(event) =>
				onChange?.(
					mode === "multiple"
						? Array.from(event.target.selectedOptions).map((option) => option.value)
						: event.target.value,
				)
			}
			disabled={disabled}
			className={className}
			style={style}
			multiple={mode === "multiple"}
			aria-label={ariaLabel || placeholder}
		>
			{children}
		</select>
	);
	Select.Option = Option;

	return {
		Alert: ({ message, description, type }) => (
			<div role={type === "warning" ? "alert" : undefined}>
				<span>{message}</span>
				<span>{description}</span>
			</div>
		),
		Button,
		Card: ({ children, title, className, onClick }) => (
			<section className={className} onClick={onClick}>
				<div>{title}</div>
				{children}
			</section>
		),
		DatePicker: () => <input aria-label='month picker' />,
		Modal: ({ open, children }) => (open ? <div>{children}</div> : null),
		Progress: ({ percent }) => <div data-testid='occupancy-progress'>{percent}%</div>,
		Select,
		Spin: ({ tip }) => <div>{tip || "Loading"}</div>,
		Switch: ({ checked, onChange }) => (
			<input
				type='checkbox'
				checked={checked}
				onChange={(event) => onChange?.(event.target.checked)}
			/>
		),
		Tag: ({ children }) => <span>{children}</span>,
		Tooltip: ({ children }) => children,
	};
});

const HOTEL_ID = "hotel-1";
const REPORT_AMOUNT = 9876.54;
const PAID_AMOUNT = 17.25;
const ONSITE_AMOUNT = 3.5;

const completeMetadata = () => ({
	netFallback: 0,
	unavailable: 0,
	foreignCurrency: 0,
});

const metadataFor = (source, issueSource, issueField) => ({
	...completeMetadata(),
	...(source === issueSource ? { [issueField]: 1 } : {}),
});

const occupancyPayload = ({
	mode = "net",
	marker = "CURRENT",
	metadata = completeMetadata(),
} = {}) => ({
	success: true,
	hotel: { _id: HOTEL_ID, hotelName: marker },
	days: [
		{
			date: "2026-07-01",
			rooms: {
				room1: {
					capacity: 2,
					booked: 1,
					occupied: 1,
					available: 1,
					occupancyRate: 0.5,
				},
			},
			totals: {
				capacity: 2,
				booked: 1,
				occupied: 1,
				available: 1,
				occupancyRate: 0.5,
			},
		},
	],
	roomTypes: [
		{
			key: "room1",
			label: "Test Room",
			totalRooms: 2,
			color: "#008c73",
		},
	],
	summary: {
		averageOccupancyRate: 0.42,
		capacityRoomNights: 2,
		bookedRoomNights: 1,
		occupiedRoomNights: 1,
		remainingRoomNights: 1,
		totalRoomsAll: 2,
		totalPhysicalRooms: 2,
		checkinReservationsCount: 1,
		checkinTotal: REPORT_AMOUNT,
		financialMetadata: metadata,
		occupancyByType: [
			{
				key: "room1",
				label: "Test Room",
				capacityNights: 2,
				bookedNights: 1,
				occupiedNights: 1,
				occupancyRate: 0.5,
			},
		],
		paymentBreakdown: [
			{
				status: "Captured",
				label: "Captured",
				count: 1,
				totalAmount: REPORT_AMOUNT,
				paidAmount: PAID_AMOUNT,
				onsitePaidAmount: ONSITE_AMOUNT,
			},
		],
		warnings: [],
	},
	totalMode: mode,
});

const bookingSourcePayload = (metadata = completeMetadata()) => ({
	statuses: ["Captured"],
	rows: [
		{
			booking_source: "Direct",
			totalsByStatus: { Captured: REPORT_AMOUNT },
			rowTotal: REPORT_AMOUNT,
		},
	],
	columnTotals: { Captured: REPORT_AMOUNT },
	overallTotal: REPORT_AMOUNT,
	financialMetadata: metadata,
});

const datePayload = (dateBasis, metadata = completeMetadata()) => ({
	statuses: ["Captured"],
	rows: [
		{
			date: "2026-07-01",
			[dateBasis === "checkin" ? "checkin_date" : "checkout_date"]:
				"2026-07-01",
			reservationsCount: 1,
			totalsByStatus: { Captured: REPORT_AMOUNT },
			rowTotal: REPORT_AMOUNT,
		},
	],
	columnTotals: { Captured: REPORT_AMOUNT },
	overallTotal: REPORT_AMOUNT,
	overallReservationsCount: 1,
	financialMetadata: metadata,
});

const installResolvedRequests = ({
	issueSource = "",
	issueField = "unavailable",
} = {}) => {
	getHotelOccupancyCalendar.mockImplementation((userId, token, options) =>
		Promise.resolve(
			occupancyPayload({
				mode: options.totalMode,
				marker: `${String(options.totalMode).toUpperCase()}-MARKER`,
				metadata: metadataFor("occupancy", issueSource, issueField),
			}),
		),
	);
	getBookingSourcePaymentSummary.mockResolvedValue({
		data: bookingSourcePayload(
			metadataFor("bookingSource", issueSource, issueField),
		),
	});
	getCheckoutDatePaymentSummary.mockImplementation((userId, token, options) =>
		Promise.resolve({
			data: datePayload(
				options.dateBasis,
				metadataFor(options.dateBasis, issueSource, issueField),
			),
		}),
	);
};

const deferred = () => {
	let resolve;
	let reject;
	const promise = new Promise((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};

const renderInventory = (chosenLanguage = "English") =>
	render(
		<MemoryRouter
			initialEntries={[
				`/admin/overall-hotel-reports?tab=inventory&invHotel=${HOTEL_ID}&invCal=gregorian&invMonth=2026-07`,
			]}
		>
			<HotelsInventoryMap chosenLanguage={chosenLanguage} />
		</MemoryRouter>,
	);

const QueryModeDriver = ({ onGrossUrl }) => {
	const history = useHistory();
	const location = useLocation();
	React.useEffect(() => {
		if (new URLSearchParams(location.search).get("invTotal") === "gross") {
			onGrossUrl?.();
		}
	}, [location.search, onGrossUrl]);
	return (
		<button
			type='button'
			onClick={() => {
				const params = new URLSearchParams(location.search);
				params.set("invTotal", "gross");
				history.replace({
					pathname: location.pathname,
					search: `?${params.toString()}`,
				});
			}}
		>
			Set Gross URL
		</button>
	);
};

const renderInventoryWithQueryDriver = (onGrossUrl) =>
	render(
		<MemoryRouter
			initialEntries={[
				`/admin/overall-hotel-reports?tab=inventory&invHotel=${HOTEL_ID}&invCal=gregorian&invMonth=2026-07`,
			]}
		>
			<HotelsInventoryMap chosenLanguage='English' />
			<QueryModeDriver onGrossUrl={onGrossUrl} />
		</MemoryRouter>,
	);

beforeEach(() => {
	jest.clearAllMocks();
	isAuthenticated.mockReturnValue({ user: { _id: "admin-1" }, token: "token-1" });
	gettingHotelDetailsForAdmin.mockResolvedValue({
		hotels: [{ _id: HOTEL_ID, hotelName: "Test Hotel" }],
	});
	distinctBookingSources.mockResolvedValue([]);
});

it("defaults to Net, sends the mode to all four requests, and switches to Gross without changing occupancy or paid cash", async () => {
	installResolvedRequests();
	renderInventory();

	expect(await screen.findByText(/NET-MARKER/)).toBeTruthy();
	expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(1);
	expect(getBookingSourcePaymentSummary).toHaveBeenCalledTimes(1);
	expect(getCheckoutDatePaymentSummary).toHaveBeenCalledTimes(2);
	expect(getHotelOccupancyCalendar.mock.calls[0][2].totalMode).toBe("net");
	expect(getBookingSourcePaymentSummary.mock.calls[0][2].totalMode).toBe("net");
	expect(
		getCheckoutDatePaymentSummary.mock.calls.map((call) => [
			call[2].dateBasis,
			call[2].totalMode,
		]),
	).toEqual([
		["checkout", "net"],
		["checkin", "net"],
	]);
	expect(screen.getAllByText("Net Total (SAR)").length).toBeGreaterThan(0);
	expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
	expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Avail 1").length).toBeGreaterThan(0);
	expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
	expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);

	fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));

	expect(await screen.findByText(/GROSS-MARKER/)).toBeTruthy();
	expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(2);
	expect(getBookingSourcePaymentSummary).toHaveBeenCalledTimes(2);
	expect(getCheckoutDatePaymentSummary).toHaveBeenCalledTimes(4);
	expect(getHotelOccupancyCalendar.mock.calls[1][2].totalMode).toBe("gross");
	expect(getBookingSourcePaymentSummary.mock.calls[1][2].totalMode).toBe("gross");
	expect(
		getCheckoutDatePaymentSummary.mock.calls.slice(2).map((call) => [
			call[2].dateBasis,
			call[2].totalMode,
		]),
	).toEqual([
		["checkout", "gross"],
		["checkin", "gross"],
	]);
	expect(screen.getAllByText("Gross Total (SAR)").length).toBeGreaterThan(0);
	expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
	expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Avail 1").length).toBeGreaterThan(0);
	expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
	expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);
});

it("never commits an old Net batch after Gross is selected", async () => {
	const net = {
		occupancy: deferred(),
		booking: deferred(),
		checkout: deferred(),
		checkin: deferred(),
	};
	const gross = {
		occupancy: deferred(),
		booking: deferred(),
		checkout: deferred(),
		checkin: deferred(),
	};
	getHotelOccupancyCalendar.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net).occupancy.promise,
	);
	getBookingSourcePaymentSummary.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net).booking.promise,
	);
	getCheckoutDatePaymentSummary.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net)[options.dateBasis].promise,
	);

	renderInventory();
	await waitFor(() => expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByRole("button", { name: "Gross Total" }));
	await waitFor(() => expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(2));

	await act(async () => {
		net.occupancy.resolve(occupancyPayload({ marker: "STALE-NET" }));
		net.booking.resolve({ data: bookingSourcePayload() });
		net.checkout.resolve({ data: datePayload("checkout") });
		net.checkin.resolve({ data: datePayload("checkin") });
		await Promise.all([
			net.occupancy.promise,
			net.booking.promise,
			net.checkout.promise,
			net.checkin.promise,
		]);
	});
	expect(screen.queryByText(/STALE-NET/)).toBeNull();

	await act(async () => {
		gross.occupancy.resolve(
			occupancyPayload({ mode: "gross", marker: "LATEST-GROSS" }),
		);
		gross.booking.resolve({ data: bookingSourcePayload() });
		gross.checkout.resolve({ data: datePayload("checkout") });
		gross.checkin.resolve({ data: datePayload("checkin") });
		await Promise.all([
			gross.occupancy.promise,
			gross.booking.promise,
			gross.checkout.promise,
			gross.checkin.promise,
		]);
	});
	expect(await screen.findByText(/LATEST-GROSS/)).toBeTruthy();
	expect(screen.queryByText(/STALE-NET/)).toBeNull();
});

it("invalidates the old Net batch during URL hydration before Gross fetch effects run", async () => {
	const net = {
		occupancy: deferred(),
		booking: deferred(),
		checkout: deferred(),
		checkin: deferred(),
	};
	const gross = {
		occupancy: deferred(),
		booking: deferred(),
		checkout: deferred(),
		checkin: deferred(),
	};
	getHotelOccupancyCalendar.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net).occupancy.promise,
	);
	getBookingSourcePaymentSummary.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net).booking.promise,
	);
	getCheckoutDatePaymentSummary.mockImplementation((userId, token, options) =>
		(options.totalMode === "gross" ? gross : net)[options.dateBasis].promise,
	);
	const releaseStaleNetFromUrlEffect = jest.fn(() => {
		net.occupancy.resolve(occupancyPayload({ marker: "STALE-URL-NET" }));
		net.booking.resolve({ data: bookingSourcePayload() });
		net.checkout.resolve({ data: datePayload("checkout") });
		net.checkin.resolve({ data: datePayload("checkin") });
	});

	renderInventoryWithQueryDriver(releaseStaleNetFromUrlEffect);
	await waitFor(() => expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(1));
	fireEvent.click(screen.getByRole("button", { name: "Set Gross URL" }));
	await waitFor(() => expect(releaseStaleNetFromUrlEffect).toHaveBeenCalledTimes(1));
	await waitFor(() => expect(getHotelOccupancyCalendar).toHaveBeenCalledTimes(2));
	expect(screen.queryByText(/STALE-URL-NET/)).toBeNull();

	await act(async () => {
		gross.occupancy.resolve(
			occupancyPayload({ mode: "gross", marker: "LATEST-URL-GROSS" }),
		);
		gross.booking.resolve({ data: bookingSourcePayload() });
		gross.checkout.resolve({ data: datePayload("checkout") });
		gross.checkin.resolve({ data: datePayload("checkin") });
		await Promise.all([
			gross.occupancy.promise,
			gross.booking.promise,
			gross.checkout.promise,
			gross.checkin.promise,
		]);
	});
	expect(await screen.findByText(/LATEST-URL-GROSS/)).toBeTruthy();
	expect(screen.queryByText(/STALE-URL-NET/)).toBeNull();
});

it.each([
	["occupancy", "unavailable"],
	["bookingSource", "foreignCurrency"],
	["checkin", "unavailable"],
	["checkout", "foreignCurrency"],
])(
	"fails every selected-basis monetary surface closed when %s metadata reports %s",
	async (issueSource, issueField) => {
		installResolvedRequests({ issueSource, issueField });
		renderInventory();

		expect(
			await screen.findByText("Selected booking totals are unavailable"),
		).toBeTruthy();
		expect(screen.queryByText("9,876.54")).toBeNull();
		expect(screen.getAllByText("N/A").length).toBeGreaterThan(10);
		expect(
			screen
				.getByText("Net (checkout-date basis)")
				.closest(".metric")
				.querySelector("b").textContent,
		).toBe("N/A");
		expect(
			screen
				.getByText("Check-in net (SAR)")
				.closest(".metric")
				.querySelector("b").textContent,
		).toBe("N/A");

		[
			["Booking source net totals by checkout date (SAR)", 4],
			["Check-in date net totals by payment status (SAR)", 4],
			["Checkout date net totals by payment status (SAR)", 4],
		].forEach(([title, minimumUnavailableCells]) => {
			const table = screen.getByText(title).parentElement.querySelector("table");
			expect(within(table).getAllByText("N/A").length).toBeGreaterThanOrEqual(
				minimumUnavailableCells,
			);
		});

		const paymentTable = screen
			.getByText("Payment status totals")
			.parentElement.querySelector("table");
		const paymentCells = within(paymentTable)
			.getAllByRole("cell")
			.map((cell) => cell.textContent);
		expect(paymentCells).toEqual([
			"Captured",
			"1",
			"N/A",
			"17.25",
			"3.50",
		]);
		expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
		expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Avail 1").length).toBeGreaterThan(0);
	},
);

it.each(["bookingSource", "checkin", "checkout"])(
	"fails selected-basis totals closed when the %s aggregate rejects",
	async (rejectedSource) => {
		installResolvedRequests();
		if (rejectedSource === "bookingSource") {
			getBookingSourcePaymentSummary.mockRejectedValue(
				new Error("booking-source summary failed"),
			);
		} else {
			getCheckoutDatePaymentSummary.mockImplementation(
				(userId, token, options) =>
					options.dateBasis === rejectedSource
						? Promise.reject(new Error(`${rejectedSource} summary failed`))
						: Promise.resolve({ data: datePayload(options.dateBasis) }),
			);
		}

		renderInventory();

		expect(
			await screen.findByText("Selected booking totals are unavailable"),
		).toBeTruthy();
		expect(screen.queryByText("9,876.54")).toBeNull();
		expect(screen.getAllByText("N/A").length).toBeGreaterThan(10);
		expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
		expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);
		expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
		expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Avail 1").length).toBeGreaterThan(0);
	},
);

it("fails selected-basis totals closed when an aggregate response is missing", async () => {
	installResolvedRequests();
	getBookingSourcePaymentSummary.mockResolvedValue({ data: null });

	renderInventory();

	expect(
		await screen.findByText("Selected booking totals are unavailable"),
	).toBeTruthy();
	expect(screen.queryByText("9,876.54")).toBeNull();
	expect(screen.getAllByText("N/A").length).toBeGreaterThan(10);
	expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
	expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);
	expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
	expect(screen.getAllByText("1/2").length).toBeGreaterThan(0);
	expect(screen.getAllByText("Avail 1").length).toBeGreaterThan(0);
});

it("does not warn or fail totals closed for Net fallback metadata alone", async () => {
	installResolvedRequests({ issueSource: "occupancy", issueField: "netFallback" });
	renderInventory();

	expect(await screen.findByText(/NET-MARKER/)).toBeTruthy();
	expect(
		screen.queryByText("Selected booking totals are unavailable"),
	).toBeNull();
	expect(screen.getAllByText("9,876.54").length).toBeGreaterThan(10);
	expect(screen.queryByText("N/A")).toBeNull();
	expect(screen.getAllByText("42%").length).toBeGreaterThan(0);
	expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
	expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);
});

it("renders the unavailable warning and N/A state in Arabic", async () => {
	installResolvedRequests({ issueSource: "occupancy", issueField: "unavailable" });
	renderInventory("Arabic");

	expect(
		await screen.findByText("إجماليات الحجز المحددة غير متاحة"),
	).toBeTruthy();
	expect(screen.getAllByText("غير متاح").length).toBeGreaterThan(10);
	expect(screen.getAllByText("17.25").length).toBeGreaterThan(0);
	expect(screen.getAllByText("3.50").length).toBeGreaterThan(0);
});
