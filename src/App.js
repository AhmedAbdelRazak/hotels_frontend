import React, { useEffect } from "react";
import "./App.css";
import { Route, Switch, BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCartContext } from "./cart_context";
import Footer from "./Footer";
import Signup from "./pages/Signup";
import Signin from "./pages/Signin";

//Management Routes
import AdminRoute from "./auth/AdminRoute";
import AdminDashboard from "./AdminModule/AdminDashboard/AdminDashboard";
import AddNewHotel from "./AdminModule/NewHotels/AddNewHotel";
import AddedHotelsMain from "./AdminModule/AddedHotels/AddedHotelsMain";
import HotelManagerDashboardAdmin from "./AdminModule/HotelModule/HotelManagement/HotelManagerDashboard";
import ReservationsMainAdmin from "./AdminModule/HotelModule/ReservationsFolder/ReservationsMain";
import NewReservationMainAdmin from "./AdminModule/HotelModule/NewReservation/NewReservationMain";
import HotelSettingsMainAdmin from "./AdminModule/HotelModule/HotelSettings/HotelSettingsMain";
import SignupNewAdmin from "./AdminModule/HotelModule/HotelStaff/SignupNew";
import PaymentMainAdmin from "./AdminModule/HotelModule/Payment/PaymentMain";
import ReceiptPDFAdmin from "./AdminModule/HotelModule/NewReservation/ReceiptPDF";
import HouseKeepingMainAdmin from "./AdminModule/HotelModule/HouseKeeping/HouseKeepingMain";
import HotelReportsMainAdmin from "./AdminModule/HotelModule/HotelReports/HotelReportsMain";
import AddOwnerAccount from "./AdminModule/AddOwner/AddOwnerAccount";

//Hotel Routes
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

//Reception Routes 98119
import ReceptionRoute from "./auth/ReceptionRoute";
import NewReservationMainReception from "./ReceptionModule/NewReservationMain";
import JanatWebsiteMain from "./AdminModule/JanatWebsite/JanatWebsiteMain";
import HouseKeepingManagerRoute from "./auth/HouseKeepingManagerRoute";
import HouseKeepingMainManagement from "./HouseKeepingManager/HouseKeepingMain";
import HouseKeepingEmployeeMain from "./HouseKeepingEmployee/HouseKeepingEmployeeMain";
import HouseKeepingEmployeeRoute from "./auth/HouseKeepingEmployeeRoute";
import FinanceRoute from "./auth/FinanceRoute";
import PaymentMainFinance from "./Finance/Payment/PaymentMainFinance";
import OwnerRoute from "./auth/OwnerRoute";
import OwnerDashboardMain from "./OwnerContent/OwnerDashboardMain";
import ClientPayVirtualCard from "./AdminModule/HotelModule/ClientPay/ClientPayVirtualCard";
import MainHotelDashboard from "./HotelModule/MainHotelDashboard";
//Conf #: 197875718, 198354414, 199118009, 198501575, 198787549, 197674274, 195732024

function App() {
	const { languageToggle, chosenLanguage } = useCartContext();

	const languageToggle2 = () => {
		localStorage.setItem("lang", JSON.stringify(chosenLanguage));
		// window.location.reload(false);
	};

	useEffect(() => {
		languageToggle2();
		languageToggle(chosenLanguage);
		// eslint-disable-next-line
	}, [chosenLanguage]);

	return (
		<BrowserRouter>
			<>
				<ToastContainer
					position='top-center'
					toastStyle={{ width: "auto", minWidth: "400px" }}
				/>

				<Switch>
					<Route path='/signup' exact component={Signup} />
					<Route path='/' exact component={Signin} />
					<Route
						path='/client-payment/:reservationId/:guestname/:guestphone/:hotelname/:roomtype/:checkin/:checkout/:daysofresidence/:totalamount'
						exact
						component={ClientPayMain}
					/>

					<AdminRoute
						path='/admin/dashboard'
						exact
						component={AdminDashboard}
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

					{/* Admin Routes for Hotels  */}
					<AdminRoute
						path='/admin-management/dashboard/:hotelId/:userId'
						exact
						component={HotelManagerDashboardAdmin}
					/>
					<AdminRoute
						path='/admin-management/reservation-history/:hotelId/:userId'
						exact
						component={ReservationsMainAdmin}
					/>
					<AdminRoute
						path='/admin-management/new-reservation/:hotelId/:userId'
						exact
						component={NewReservationMainAdmin}
					/>
					<AdminRoute
						path='/admin-management/settings/:hotelId/:userId'
						exact
						component={HotelSettingsMainAdmin}
					/>

					<AdminRoute
						path='/admin-management/staff/:hotelId/:userId'
						exact
						component={SignupNewAdmin}
					/>

					<AdminRoute
						path='/admin-management-payment/:hotelId/:userId'
						exact
						component={PaymentMainAdmin}
					/>
					<AdminRoute
						path='/admin-management/house-keeping/:hotelId/:userId'
						exact
						component={HouseKeepingMainAdmin}
					/>
					<AdminRoute path='/admin/receipt' exact component={ReceiptPDFAdmin} />
					<AdminRoute
						path='/admin-management/admin-reports/:hotelId/:userId'
						exact
						component={HotelReportsMainAdmin}
					/>

					<Route
						path='/admin/virtual-card-payments/:reservationId/:guestname/:guestphone/:hotelname/:roomtype/:checkin/:checkout/:daysofresidence/:totalamount'
						exact
						component={ClientPayVirtualCard}
					/>

					{/*End of Admin Routes for Hotels  */}
					<HotelRoute
						path='/hotel-management/main-dashboard'
						exact
						component={MainHotelDashboard}
					/>
					<HotelRoute
						path='/hotel-management/dashboard'
						exact
						component={HotelManagerDashboard}
					/>
					<HotelRoute
						path='/hotel-management/reservation-history'
						exact
						component={ReservationsMain}
					/>
					<HotelRoute
						path='/hotel-management/new-reservation'
						exact
						component={NewReservationMain}
					/>
					<HotelRoute
						path='/hotel-management/settings'
						exact
						component={HotelSettingsMain}
					/>

					<HotelRoute
						path='/hotel-management/staff'
						exact
						component={SignupNew}
					/>

					<HotelRoute
						path='/reservation-details/:confirmationNumber'
						exact
						component={ReservationDetail}
					/>

					<HotelRoute
						path='/hotel-management-payment'
						exact
						component={PaymentMain}
					/>
					<HotelRoute
						path='/hotel-management/house-keeping'
						exact
						component={HouseKeepingMain}
					/>
					<HotelRoute path='/receipt' exact component={ReceiptPDF} />
					<HotelRoute
						path='/hotel-management/hotel-reports'
						exact
						component={HotelReportsMain}
					/>

					<HouseKeepingManagerRoute
						path='/house-keeping-management/house-keeping'
						exact
						component={HouseKeepingMainManagement}
					/>

					<ReceptionRoute
						path='/reception-management/new-reservation'
						exact
						component={NewReservationMainReception}
					/>

					<HouseKeepingEmployeeRoute
						path='/house-keeping-employee/house-keeping'
						exact
						component={HouseKeepingEmployeeMain}
					/>

					<FinanceRoute
						path='/finance/overview'
						exact
						component={PaymentMainFinance}
					/>

					<OwnerRoute
						path='/owner-dashboard'
						exact
						component={OwnerDashboardMain}
					/>
				</Switch>
			</>
			<Footer />
		</BrowserRouter>
	);
}

export default App;
