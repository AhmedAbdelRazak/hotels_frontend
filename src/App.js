import React, { useEffect } from "react";
import "./App.css";
import "react-quill/dist/quill.snow.css";
import { Redirect, Route, Switch, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCartContext } from "./cart_context";
import Footer from "./Footer";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";
import Contact from "./pages/Contact";
import PMS from "./pages/PMS";
import WhyXHotel from "./pages/WhyXHotel";

// Management Routes
import AdminRoute from "./auth/AdminRoute";
import AdminDashboard from "./AdminModule/AdminDashboard/AdminDashboard";
import AddNewHotel from "./AdminModule/NewHotels/AddNewHotel";
import AddedHotelsMain from "./AdminModule/AddedHotels/AddedHotelsMain";
import AddOwnerAccount from "./AdminModule/AddOwner/AddOwnerAccount";
import IntegratorMain from "./AdminModule/ElIntegrator/IntegratorMain";
import AllReservationMain from "./AdminModule/AllReservation/AllReservationMain";
import JannatBookingToolsMain from "./AdminModule/JannatTools/JannatBookingToolsMain";
import HotelReportsMainAdmin from "./AdminModule/HotelsReport/HotelReportsMainAdmin";
import CustomerServiceMain from "./AdminModule/CustomerService/CustomerServiceMain";
import JanatWebsiteMain from "./AdminModule/JanatWebsite/JanatWebsiteMain";

// Hotel Routes
import HotelRoute from "./auth/HotelRoute";
import HotelManagerDashboard from "./HotelModule/HotelManagement/HotelManagerDashboard";
import ReservationsMain from "./HotelModule/ReservationsFolder/ReservationsMain";
import NewReservationMain from "./HotelModule/NewReservation/NewReservationMain";
import HotelSettingsMain from "./HotelModule/HotelSettings/HotelSettingsMain";
import SignupNew from "./HotelModule/HotelStaff/SignupNew";
import ReservationDetail from "./HotelModule/ReservationsFolder/ReservationDetail";
import ClientPayMain from "./HotelModule/ClientPay/ClientPayMain";
import PaymentMain from "./HotelModule/Payment/PaymentMain";
import ReceiptPDF from "./HotelModule/NewReservation/ReceiptPDF";
import HouseKeepingMain from "./HotelModule/HouseKeeping/HouseKeepingMain";
import HotelReportsMain from "./HotelModule/HotelReports/HotelReportsMain";
import MainHotelDashboard from "./HotelModule/MainHotelDashboard";
import CustomerServiceHotelMain from "./HotelModule/CustomerService/CustomerServiceHotelMain";
import { isAuthenticated } from "./auth";

import Navmenu from "./pages/Navmenu";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminPaymentMain from "./AdminModule/Payment/AdminPaymentMain";
import AdminFinancialMain from "./AdminModule/Financials/FinancialMain";
import HotelFinancialMain from "./HotelModule/Financials/FinancialMain";

const getUserHotelId = (user = {}) => {
	if (user.hotelIdWork) return user.hotelIdWork;
	if (Array.isArray(user.hotelsToSupport) && user.hotelsToSupport.length) {
		return user.hotelsToSupport[0]?._id || user.hotelsToSupport[0];
	}
	return "";
};

const getLegacyReceptionQuery = (search = "") => {
	const params = new URLSearchParams(search || "");
	if (params.has("newReservation")) return "?newReservation";
	if (params.has("list")) return "?list=&page=1";
	if (params.has("heatmap")) return "?heatmap";
	if (params.has("housingreport")) return "?housingreport";
	return "?reserveARoom";
};

const LegacyReceptionRedirect = ({ location }) => {
	const auth = isAuthenticated();
	const user = auth?.user;
	if (!user) return <Redirect to='/' />;

	const ownerId = user.belongsToId || user._id;
	const hotelId = getUserHotelId(user);
	if (!ownerId || !hotelId) {
		return <Redirect to='/hotel-management/main-dashboard' />;
	}

	return (
		<Redirect
			to={`/hotel-management/new-reservation/${ownerId}/${hotelId}${getLegacyReceptionQuery(
				location?.search
			)}`}
		/>
	);
};

const LegacyScopedHotelRedirect = ({ route }) => {
	const auth = isAuthenticated();
	const user = auth?.user;
	if (!user) return <Redirect to='/' />;

	const ownerId = user.belongsToId || user._id;
	const hotelId = getUserHotelId(user);
	if (!ownerId || !hotelId) {
		return <Redirect to='/hotel-management/main-dashboard' />;
	}

	return <Redirect to={`/hotel-management/${route}/${ownerId}/${hotelId}`} />;
};

function App() {
	const { languageToggle, chosenLanguage } = useCartContext();
	const location = useLocation(); // get current route info

	const publicPaths = ["/", "/signup", "/contact", "/pms", "/why-x-hotel"];
	const hideFooterPaths = ["/"];
	const showNav = publicPaths.includes(location.pathname);
	const hideFooter = hideFooterPaths.includes(location.pathname);

	const languageToggle2 = () => {
		localStorage.setItem("lang", JSON.stringify(chosenLanguage));
	};

	useEffect(() => {
		languageToggle2();
		languageToggle(chosenLanguage);
		// eslint-disable-next-line
	}, [chosenLanguage]);

	useEffect(() => {
		const fetchCurrencyRates = async () => {
			try {
				const response = await fetch(
					`${process.env.REACT_APP_API_URL}/currency-rates`,
				);
				if (!response.ok) {
					throw new Error("Failed to fetch currency rates");
				}
				const rates = await response.json();
				localStorage.setItem("rates", JSON.stringify(rates));
			} catch (error) {
				console.error("Error fetching currency rates:", error);
			}
		};
		// Fetch rates when the app loads
		fetchCurrencyRates();
	}, []);

	return (
		<>
			<ToastContainer
				position='top-center'
				style={{ zIndex: 2147483647 }}
				toastStyle={{ width: "auto", minWidth: "400px" }}
			/>
			{showNav && <Navmenu />}
			<Switch>
				{/* ============== Public Routes ============== */}
				<Route path='/signup' exact component={Signup} />
				<Route path='/' exact component={Signin} />
				<Route path='/contact' exact component={Contact} />
				<Route path='/pms' exact component={PMS} />
				<Route path='/why-x-hotel' exact component={WhyXHotel} />
				<Route
					path='/client-payment/:reservationId/:guestname/:guestphone/:hotelname/:roomtype/:checkin/:checkout/:daysofresidence/:totalamount'
					exact
					component={ClientPayMain}
				/>
				<Route path='/auth/forgot-password' exact component={ForgotPassword} />
				<Route path='/auth/password/forgot' exact component={ForgotPassword} />
				<Route
					path='/auth/password/reset/:token'
					exact
					component={ResetPassword}
				/>

				{/* ============== Admin Routes ============== */}
				<AdminRoute path='/admin/dashboard' exact component={AdminDashboard} />
				<AdminRoute
					path='/admin/customer-service'
					exact
					component={CustomerServiceMain}
				/>
				<AdminRoute
					path='/admin/el-integrator'
					exact
					component={IntegratorMain}
				/>
				<AdminRoute
					path='/admin/all-reservations'
					exact
					component={AllReservationMain}
				/>
				<AdminRoute
					path='/admin/jannatbooking-tools'
					exact
					component={JannatBookingToolsMain}
				/>
				<AdminRoute path='/admin/new-hotel' exact component={AddNewHotel} />
				<AdminRoute
					path='/admin/add-owner-account'
					exact
					component={AddOwnerAccount}
				/>
				<AdminRoute
					path='/admin/janat-website'
					exact
					component={JanatWebsiteMain}
				/>
				<AdminRoute
					path='/admin/added-hotels'
					exact
					component={AddedHotelsMain}
				/>
				<AdminRoute path='/admin/dashboard' exact component={AdminDashboard} />

				{/* ============== Admin Hotel Reports ============== */}
				<AdminRoute
					path='/admin/overall-hotel-reports'
					exact
					component={HotelReportsMainAdmin}
				/>

				<AdminRoute
					path='/admin/expenses-financials'
					exact
					component={AdminFinancialMain}
				/>

				<AdminRoute
					path='/admin/payouts-report'
					exact
					component={AdminPaymentMain}
				/>

				{/* ============== Hotel Routes ============== */}
				<HotelRoute
					path='/hotel-management/main-dashboard'
					exact
					component={MainHotelDashboard}
				/>
				<HotelRoute
					path='/hotel-management/dashboard/:userId/:hotelId'
					exact
					component={HotelManagerDashboard}
				/>
				<HotelRoute
					path='/hotel-management/customer-service/:userId/:hotelId'
					exact
					component={CustomerServiceHotelMain}
				/>
				<HotelRoute
					path='/hotel-management/reservation-history/:userId/:hotelId'
					exact
					component={ReservationsMain}
				/>
				<HotelRoute
					path='/hotel-management/new-reservation/:userId/:hotelId'
					exact
					component={NewReservationMain}
				/>
				<HotelRoute
					path='/hotel-management/settings/:userId/:hotelId'
					exact
					component={HotelSettingsMain}
				/>
				<HotelRoute
					path='/hotel-management/staff/:userId/:hotelId'
					exact
					component={SignupNew}
				/>
				<HotelRoute
					path='/reservation-details/:confirmationNumber'
					exact
					component={ReservationDetail}
				/>
				<HotelRoute
					path='/hotel-management-payment/:userId/:hotelId'
					exact
					component={PaymentMain}
				/>
				<HotelRoute
					path='/hotel-management/financials/:userId/:hotelId'
					exact
					component={HotelFinancialMain}
				/>
				<HotelRoute
					path='/hotel-management/house-keeping/:userId/:hotelId'
					exact
					component={HouseKeepingMain}
				/>
				<HotelRoute path='/receipt' exact component={ReceiptPDF} />

				{/* ============== Hotel-Reports for Hotel Staff ============== */}
				<HotelRoute
					path='/hotel-management/hotel-reports/:userId/:hotelId'
					exact
					component={HotelReportsMain}
				/>

				{/* ============== HouseKeeping Manager ============== */}
				<Route
					path='/house-keeping-management/house-keeping'
					exact
					render={() => <LegacyScopedHotelRedirect route='house-keeping' />}
				/>

				{/* ============== Legacy Reception Redirect ============== */}
				<Route
					path='/reception-management/new-reservation'
					exact
					component={LegacyReceptionRedirect}
				/>

				{/* ============== HouseKeeping Employee ============== */}
				<Route
					path='/house-keeping-employee/house-keeping'
					exact
					render={() => <LegacyScopedHotelRedirect route='house-keeping' />}
				/>

				{/* ============== Finance ============== */}
				<Route
					path='/finance/overview'
					exact
					render={() => <LegacyScopedHotelRedirect route='dashboard' />}
				/>

				{/* ============== Owner ============== */}
				<Route
					path='/owner-dashboard'
					exact
					render={() => <Redirect to='/hotel-management/main-dashboard' />}
				/>
			</Switch>
			{!hideFooter && <Footer />}
		</>
	);
}

export default App;
