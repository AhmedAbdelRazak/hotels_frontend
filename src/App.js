import React, { useEffect } from "react";
import "./App.css";
import "react-quill/dist/quill.snow.css";
import { Route, Switch, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCartContext } from "./cart_context";
import Footer from "./Footer";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";

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

// Reception Routes
import ReceptionRoute from "./auth/ReceptionRoute";
import NewReservationMainReception from "./ReceptionModule/NewReservationMain";

// Housekeeping Management
import HouseKeepingManagerRoute from "./auth/HouseKeepingManagerRoute";
import HouseKeepingMainManagement from "./HouseKeepingManager/HouseKeepingMain";

// Housekeeping Employee
import HouseKeepingEmployeeRoute from "./auth/HouseKeepingEmployeeRoute";
import HouseKeepingEmployeeMain from "./HouseKeepingEmployee/HouseKeepingEmployeeMain";

// Finance
import FinanceRoute from "./auth/FinanceRoute";
import PaymentMainFinance from "./Finance/Payment/PaymentMainFinance";

// Owner
import OwnerRoute from "./auth/OwnerRoute";
import OwnerDashboardMain from "./OwnerContent/OwnerDashboardMain";

function App() {
	const { languageToggle, chosenLanguage } = useCartContext();

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
					`${process.env.REACT_APP_API_URL}/currency-rates`
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
		<BrowserRouter>
			<ToastContainer
				position='top-center'
				toastStyle={{ width: "auto", minWidth: "400px" }}
			/>
			<Switch>
				{/* ============== Public Routes ============== */}
				<Route path='/signup' exact component={Signup} />
				<Route path='/' exact component={Signin} />
				<Route
					path='/client-payment/:reservationId/:guestname/:guestphone/:hotelname/:roomtype/:checkin/:checkout/:daysofresidence/:totalamount'
					exact
					component={ClientPayMain}
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
				<HouseKeepingManagerRoute
					path='/house-keeping-management/house-keeping'
					exact
					component={HouseKeepingMainManagement}
				/>

				{/* ============== Reception Module ============== */}
				<ReceptionRoute
					path='/reception-management/new-reservation'
					exact
					component={NewReservationMainReception}
				/>

				{/* ============== HouseKeeping Employee ============== */}
				<HouseKeepingEmployeeRoute
					path='/house-keeping-employee/house-keeping'
					exact
					component={HouseKeepingEmployeeMain}
				/>

				{/* ============== Finance ============== */}
				<FinanceRoute
					path='/finance/overview'
					exact
					component={PaymentMainFinance}
				/>

				{/* ============== Owner ============== */}
				<OwnerRoute
					path='/owner-dashboard'
					exact
					component={OwnerDashboardMain}
				/>
			</Switch>
			<Footer />
		</BrowserRouter>
	);
}

export default App;
