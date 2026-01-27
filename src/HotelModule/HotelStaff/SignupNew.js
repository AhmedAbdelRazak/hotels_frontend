import React, { useEffect, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled from "styled-components";
// import { Link } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import ZSignupForm from "./ZSignupForm";
import { defaultUserValues } from "../../AdminModule/NewHotels/Assets";
import { toast } from "react-toastify";
import { isAuthenticated, signup } from "../../auth";
import { getHotelDetails, hotelAccount } from "../apiAdmin";
import { getStoredMenuCollapsed } from "../utils/menuState";

const SignupNew = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [values, setValues] = useState(defaultUserValues);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [roleDescription, setRoleDescription] = useState("");
	const [hotelDetails, setHotelDetails] = useState("");

	const { languageToggle, chosenLanguage } = useCartContext();

	const { user, token } = isAuthenticated();
	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, [hasStoredCollapsed]);

	const gettingHotelData = () => {
		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log("This is erroring");
				console.log(data.error, "Error rendering");
			} else {
				getHotelDetails(data._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2.length > 0) {
							setHotelDetails(data2[0]);
						}
					}
				});
			}
		});
	};

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, []);

	const handleChange = (name) => (event) => {
		setValues({
			...values,
			error: false,
			misMatch: false,
			[name]: event.target.value,
		});
	};

	const clickSubmit = (event) => {
		event.preventDefault();
		if (values.password !== values.password2) {
			setValues({
				...values,
				success: false,
				misMatch: true,
			});
			return <>{toast.error("Error! Passwords are not matching")}</>;
		} else {
			setValues({ ...values, error: false, misMatch: false });
			signup({
				name: values.name,
				email: values.email,
				password: values.password,
				password2: values.password2,
				misMatch: values.misMatch,
				role:
					roleDescription === "reception"
						? 3000
						: roleDescription === "housekeepingmanager"
						  ? 4000
						  : roleDescription === "housekeeping"
						    ? 5000
						    : roleDescription === "finance"
						      ? 6000
						      : 2000,
				roleDescription: roleDescription,
				phone: values.phone,
				hotelName: hotelDetails.belongsTo.hotelName,
				hotelAddress: hotelDetails.belongsTo.hotelAddress,
				hotelCountry: hotelDetails.belongsTo.hotelCountry,
				hotelState: hotelDetails.belongsTo.hotelState,
				hotelCity: hotelDetails.belongsTo.hotelCity,
				hotelIdWork: hotelDetails._id, //Mohem
				belongsToId: hotelDetails.belongsTo._id,
			}).then((data) => {
				if (data.error || data.misMatch) {
					setValues({ ...values, error: data.error, success: false });
					toast.error(data.error);
				} else {
					console.log("habal");
					toast.success("Account was successfully created!");
					setTimeout(() => {
						window.location.reload(false);
					}, 1500);
				}
			});
		}
	};

	console.log(hotelDetails, "hotelDetails");
	return (
		<SignupNewWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			show={collapsed}
		>
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HotelStaff'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HotelStaff'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div className='container-wrapper'>
						{chosenLanguage === "Arabic" ? (
							<h1>مرحبًا، يرجى التأكد من عدم إعطاء كلمة مرور الحساب لموظفيك</h1>
						) : (
							<h1>
								Hi There, Please ensure not to give this password to any of your
								staff
							</h1>
						)}
						<div className='py-3'>
							<ZSignupForm
								chosenLanguage={chosenLanguage}
								values={values}
								clickSubmit={clickSubmit}
								handleChange={handleChange}
								roleDescription={roleDescription}
								setRoleDescription={setRoleDescription}
							/>
						</div>
					</div>
				</div>
			</div>
		</SignupNewWrapper>
	);
};

export default SignupNew;

const SignupNewWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */
	margin-top: 46px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}

	h1 {
		font-size: 1.8rem;
		font-weight: bold;
		text-align: center;
		color: darkred;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
