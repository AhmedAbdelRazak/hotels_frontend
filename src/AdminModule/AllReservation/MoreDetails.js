import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { Spin, Modal, Select, Checkbox } from "antd";
import moment from "moment";
import { EditOutlined } from "@ant-design/icons";
import {
	getHotelRooms,
	sendPaymnetLinkToTheClient,
	sendReservationConfirmationEmail,
	updateSingleReservation,
} from "../../HotelModule/apiAdmin";
import { toast } from "react-toastify";
import EditReservationMain from "./EditReservationMain";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";
import { relocationArray1 } from "../../HotelModule/ReservationsFolder/ReservationAssets";
import PaymentTrigger from "./PaymentTrigger";
import ReceiptPDF from "./ReceiptPDF";
import ReceiptPDFB2B from "./ReceiptPDFB2B";

const Wrapper = styled.div`
	min-height: 750px;
	margin-top: 30px;
	text-align: ${(props) => (props.isArabic ? "right" : "")};
`;

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 170px;
	background-color: #f2f2f2;
	padding: 0 16px;
	h4,
	h3 {
		font-weight: bold;
	}

	button {
		background-color: black;
		color: white;
		padding: 1px;
		font-size: 13px;
		border-radius: 5px;
		text-align: center;
		margin: auto;
	}
`;

const Section = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: center;
`;

const HorizontalLine = styled.hr`
	border: none;
	border-bottom: 2px solid black;
	margin: 0;
`;

const Content = styled.div`
	display: flex;
	padding: 16px;
`;

const ContentSection = styled.div`
	padding: 0 16px;

	&:first-child,
	&:last-child {
		flex: 0 0 30%;
	}

	&:nth-child(2) {
		flex: 0 0 40%;
		border-right: 1px solid #ddd;
		border-left: 1px solid #ddd;
	}
`;

// ... other styled components

const safeNumber = (val) => {
	const parsed = Number(val);
	return isNaN(parsed) ? 0 : parsed;
};

const MoreDetails = ({ reservation, setReservation, hotelDetails }) => {
	const pdfRef = useRef(null);
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);
	const [isModalVisible3, setIsModalVisible3] = useState(false);
	const [isModalVisible5, setIsModalVisible5] = useState(false);
	const [isModalVisible4, setIsModalVisible4] = useState(false);
	const [linkModalVisible, setLinkModalVisible] = useState(false);
	const [chosenRooms, setChosenRooms] = useState([]);
	const [selectedHotelDetails, setSelectedHotelDetails] = useState("");
	const [sendEmail, setSendEmail] = useState(true);

	// eslint-disable-next-line
	const [selectedStatus, setSelectedStatus] = useState("");
	const [linkGenerate, setLinkGenerated] = useState("");

	const { languageToggle, chosenLanguage } = useCartContext();

	// eslint-disable-next-line
	const { user, token } = isAuthenticated();

	const getTotalAmountPerDay = (pickedRoomsType) => {
		return pickedRoomsType.reduce((total, room) => {
			return total + room.chosenPrice * room.count;
		}, 0); // Start with 0 for the total
	};

	const calculateDaysBetweenDates = (startDate, endDate) => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			console.error("Invalid start or end date");
			return 0;
		}
		const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return days > 0 ? days : 1; // Ensures a minimum of 1 day
	};

	// Calculate the number of days of residency
	// eslint-disable-next-line
	const daysOfResidence = calculateDaysBetweenDates(
		reservation.checkin_date,
		reservation.checkout_date
	);

	// Revised calculateReservationPeriod function
	function calculateReservationPeriod(checkin, checkout, language) {
		// Parse the checkin and checkout dates to ignore the time component
		const checkinDate = moment(checkin).startOf("day");
		const checkoutDate = moment(checkout).startOf("day");

		// Calculate the duration in days
		const days = checkoutDate.diff(checkinDate, "days") + 1;
		// Calculate the nights as one less than the total days
		const nights = days - 1;

		// Define the text for "days" and "nights" based on the selected language
		const daysText = language === "Arabic" ? "أيام" : "days";
		const nightsText = language === "Arabic" ? "ليال" : "nights";

		// Return the formatted string showing both days and nights
		return `${days} ${daysText} / ${nights} ${nightsText}`;
	}

	const handleUpdateReservationStatus = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				reservation_status: selectedStatus,
				hotelName: hotelDetails.hotelName,
				sendEmail, // ✅ Include sendEmail in the update
			};

			// ✅ Handle early check-out logic
			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => total + room.count * parseFloat(room.chosenPrice),
					0
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			// ✅ Call API with sendEmail flag
			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Status was successfully updated");
					setIsModalVisible(false);
					setReservation(response.reservation);
				}
			});
		}
	};

	const handleUpdateReservationStatus2 = () => {
		if (!selectedStatus) {
			return toast.error("Please Select A Status...");
		}

		const confirmationMessage = `Are you sure you want to change the status of the reservation to ${selectedStatus}?`;
		if (window.confirm(confirmationMessage)) {
			const updateData = { reservation_status: selectedStatus };

			// If the selected status is 'early_checked_out', also update the checkout_date and related fields
			if (selectedStatus === "early_checked_out") {
				const newCheckoutDate = new Date();
				const startDate = new Date(reservation.checkin_date);
				const diffTime = Math.abs(newCheckoutDate - startDate);
				const daysOfResidence = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

				updateData.checkout_date = newCheckoutDate.toISOString();
				updateData.days_of_residence = daysOfResidence;

				// Calculate the new total amount
				const totalAmountPerDay = reservation.pickedRoomsType.reduce(
					(total, room) => {
						return total + room.count * parseFloat(room.chosenPrice);
					},
					0
				);

				updateData.total_amount = totalAmountPerDay * daysOfResidence;
			}

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Status was successfully updated");
					setIsModalVisible(false);

					// Update local state or re-fetch reservation data if necessary
					setReservation(response);
				}
			});
		}
	};

	const handleUpdateReservationStatus3 = () => {
		if (
			!selectedHotelDetails ||
			!selectedHotelDetails.belongsTo ||
			!selectedHotelDetails._id
		) {
			return toast.error("Please Select Your Desired Hotel For Relocation");
		}

		const confirmationMessage = `Are You Sure You want to re-locate this reservation? Once relocated, it will disappear from your reservation list`;
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				belongsTo: selectedHotelDetails.belongsTo,
				hotelId: selectedHotelDetails._id,
				state: "relocated",
			};

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error("An error occurred while updating the status");
				} else {
					toast.success("Reservation was successfully relocated");
					setIsModalVisible4(false);
					setTimeout(() => {
						window.location.reload(false);
					}, 1500);
				}
			});
		}
	};

	const getHotelRoomsDetails = () => {
		getHotelRooms(reservation.hotelId, user._id).then((data3) => {
			if (data3 && data3.error) {
				console.log(data3.error);
			} else {
				// Filter the rooms to only include those whose _id is in reservation.roomId
				const filteredRooms = data3.filter((room) =>
					reservation.roomId.includes(room._id)
				);
				setChosenRooms(filteredRooms);
			}
		});
	};

	useEffect(() => {
		if (reservation && reservation.roomId && reservation.roomId.length > 0) {
			getHotelRoomsDetails();
		}
		// eslint-disable-next-line
	}, []);

	const downloadPDF = () => {
		html2canvas(pdfRef.current, { scale: 1 }).then((canvas) => {
			const imgData = canvas.toDataURL("image/png");

			// Let's create a PDF and add our image into it
			const pdf = new jsPDF({
				orientation: "p",
				unit: "pt",
				format: "a4",
			});

			const pdfWidth = pdf.internal.pageSize.getWidth();
			const pdfHeight = pdf.internal.pageSize.getHeight();

			// Calculate the number of pages.
			const imgHeight = (canvas.height * pdfWidth) / canvas.width;
			let heightLeft = imgHeight;

			let position = 0;

			// Add image to the first page
			pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
			heightLeft -= pdfHeight;

			// Add new pages if the content overflows
			while (heightLeft >= 0) {
				position = heightLeft - imgHeight;
				pdf.addPage();
				pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
				heightLeft -= pdfHeight;
			}

			pdf.save("receipt.pdf");
		});
	};

	const getAverageRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		let totalRootPrice = 0;
		let totalDays = 0;

		pickedRoomsType.forEach((room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				room.pricingByDay.forEach((day) => {
					totalRootPrice += parseFloat(day.rootPrice) * room.count; // Multiply by room count
				});
				totalDays += room.pricingByDay.length * room.count; // Multiply days by room count
			}
		});

		// Avoid division by zero
		return totalDays > 0 ? totalRootPrice / totalDays : 0;
	};

	const calculateOverallTotalRootPrice = (pickedRoomsType) => {
		if (!pickedRoomsType || pickedRoomsType.length === 0) return 0;

		return pickedRoomsType.reduce((total, room) => {
			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const roomTotal = room.pricingByDay.reduce((dayTotal, day) => {
					return dayTotal + parseFloat(day.rootPrice); // Sum rootPrice for all days
				}, 0);
				return total + roomTotal * room.count; // Multiply by room count
			}
			return total; // If no pricingByDay, just return total
		}, 0);
	};

	const calculateNights = (checkin, checkout) => {
		const start = new Date(checkin);
		const end = new Date(checkout);
		let nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		return nights < 1 ? 1 : nights;
	};

	// Calculate nights once (assuming all room bookings have same checkin/checkout)
	// eslint-disable-next-line
	const nights = calculateNights(
		reservation?.checkin_date,
		reservation?.checkout_date
	);

	// Compute the commission for one night from each room's pricingByDay data.
	// Same names, minimal changes
	const computedCommissionPerNight = reservation.pickedRoomsType
		? reservation.pickedRoomsType.reduce((total, room) => {
				let roomCommission = 0;
				if (room.pricingByDay && room.pricingByDay.length > 0) {
					// Use the difference: (price - rootPrice) for each day
					// then multiply by room.count
					roomCommission =
						room.pricingByDay.reduce((acc, day) => {
							// daily commission
							return acc + (Number(day.price) - Number(day.rootPrice));
						}, 0) * Number(room.count);
				}
				return total + roomCommission;
		  }, 0)
		: 0;

	// We've already accounted for all nights in pricingByDay,
	// so we do NOT multiply by 'nights' again.
	const computedCommission = computedCommissionPerNight;

	const computeOneNightCost = () => {
		if (
			!reservation.pickedRoomsType ||
			reservation.pickedRoomsType.length === 0
		)
			return 0;

		return reservation.pickedRoomsType.reduce((total, room) => {
			let firstDayRootPrice = 0;

			if (room.pricingByDay && room.pricingByDay.length > 0) {
				const firstDay = room.pricingByDay[0];
				firstDayRootPrice = safeNumber(firstDay.rootPrice);
			} else {
				// Fallback to chosenPrice if pricingByDay is missing or invalid
				firstDayRootPrice = safeNumber(room.chosenPrice);
			}

			// Multiply by the number of rooms (count)
			return total + firstDayRootPrice * safeNumber(room.count);
		}, 0);
	};

	// Compute the one night cost using the room's totalPriceWithoutCommission if available.
	const oneNightCost = computeOneNightCost() ? computeOneNightCost() : 0;

	// The final deposit is the sum of the computed commission and one night cost.
	const finalDeposit = computedCommission + oneNightCost;

	return (
		<Wrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			isArabic={chosenLanguage === "Arabic"}
		>
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>Loading...</p>
				</div>
			) : (
				<div className='otherContentWrapper'>
					<Modal
						title={
							chosenLanguage === "Arabic" ? "تعديل الحجز" : "Edit Reservation"
						}
						open={isModalVisible2}
						onCancel={() => setIsModalVisible2(false)}
						onOk={handleUpdateReservationStatus2}
						footer={null}
						width='84.5%' // Set the width to 80%
						style={{
							// If Arabic, align to the left, else align to the right
							position: "absolute",
							left: chosenLanguage === "Arabic" ? "15%" : "auto",
							right: chosenLanguage === "Arabic" ? "auto" : "5%",
							top: "1%",
						}}
					>
						{reservation && (
							<EditReservationMain
								reservation={reservation}
								setReservation={setReservation}
								chosenLanguage={chosenLanguage}
								hotelDetails={hotelDetails}
							/>
						)}
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "تعديل الحجز"
								: "Update Reservation Status"
						}
						open={isModalVisible}
						onCancel={() => setIsModalVisible(false)}
						onOk={handleUpdateReservationStatus}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={reservation && reservation.reservation_status}
							style={{
								width: "100%",
							}}
							onChange={(value) => setSelectedStatus(value)}
						>
							<Select.Option value=''>Please Select</Select.Option>
							<Select.Option value='cancelled'>Cancelled</Select.Option>
							<Select.Option value='no_show'>No Show</Select.Option>
							<Select.Option value='confirmed'>Confirmed</Select.Option>
							<Select.Option value='inhouse'>InHouse</Select.Option>
							<Select.Option value='checked_out'>Checked Out</Select.Option>
							<Select.Option value='early_checked_out'>
								Early Check Out
							</Select.Option>
						</Select>
						<Checkbox
							checked={sendEmail}
							onChange={(e) => setSendEmail(e.target.checked)}
							style={{ marginTop: "16px" }}
						>
							Send Email Notification to the Customer
						</Checkbox>
					</Modal>

					<Modal
						title={
							chosenLanguage === "Arabic"
								? "نقل الحجز؟"
								: "Relocate Reservation?"
						}
						open={isModalVisible4}
						onCancel={() => setIsModalVisible4(false)}
						onOk={handleUpdateReservationStatus3}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
					>
						<Select
							defaultValue={
								reservation && hotelDetails && hotelDetails.hotelName
							}
							style={{
								width: "100%",
								textTransform: "capitalize",
							}}
							onChange={(value) => setSelectedHotelDetails(JSON.parse(value))}
						>
							<Select.Option value=''>Please Select</Select.Option>
							{relocationArray1.map((hotel) => (
								<Select.Option
									style={{
										textTransform: "capitalize",
									}}
									key={hotel._id}
									value={JSON.stringify(hotel)}
								>
									{hotel.hotelName}
								</Select.Option>
							))}
						</Select>
					</Modal>

					<Modal
						open={linkModalVisible}
						onCancel={() => setLinkModalVisible(false)}
						onOk={() => setLinkModalVisible(false)}
						style={{
							textAlign: chosenLanguage === "Arabic" ? "center" : "",
						}}
						width={"70%"}
					>
						<h3>Payment Link:</h3>
						<div
							style={{
								marginTop: "50px",
								marginBottom: "50px",
								fontSize: "1rem",
								cursor: "pointer", // Change the cursor to indicate clickable area
								textAlign: "center", // Center align if desired
								fontWeight: "bold",
								textDecoration: "underline",
								color: "darkblue",
							}}
							onClick={() =>
								window.open(linkGenerate, "_blank", "noopener,noreferrer")
							}
						>
							{linkGenerate}
						</div>
					</Modal>

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
						<h5
							className='text-center mx-auto'
							style={{
								fontWeight: "bold",
								textDecoration: "underline",
								cursor: "pointer",
								color: "darkgoldenrod",
							}}
							onClick={() => {
								setIsModalVisible2(true);
							}}
						>
							<EditOutlined />
							{chosenLanguage === "Arabic" ? "تعديل الحجز" : "Edit Reservation"}
						</h5>

						{relocationArray1 &&
							relocationArray1.some(
								(hotel) =>
									hotel._id === hotelDetails._id &&
									hotel.belongsTo === hotelDetails.belongsTo._id
							) && (
								<h5
									className='text-center mx-auto mt-3'
									style={{
										fontWeight: "bold",
										textDecoration: "underline",
										cursor: "pointer",
										color: "#67634c",
									}}
									onClick={() => {
										setIsModalVisible4(true);
									}}
								>
									<EditOutlined />
									{chosenLanguage === "Arabic"
										? "نقل الحجز؟"
										: "Relocate Reservation?"}
								</h5>
							)}

						<Modal
							title='Receipt Download'
							open={isModalVisible3}
							onCancel={() => setIsModalVisible3(false)}
							onOk={() => setIsModalVisible3(false)}
							footer={null}
							width='84.5%' // Set the width to 80%
							style={{
								// If Arabic, align to the left, else align to the right
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto",
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDF
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>

						<Modal
							title='Ops Receipt'
							open={isModalVisible5}
							onCancel={() => setIsModalVisible5(false)}
							onOk={() => setIsModalVisible5(false)}
							footer={null}
							width='84.5%' // Set the width to 80%
							style={{
								// If Arabic, align to the left, else align to the right
								position: "absolute",
								left: chosenLanguage === "Arabic" ? "15%" : "auto",
								right: chosenLanguage === "Arabic" ? "auto" : "5%",
								top: "1%",
							}}
						>
							<div className='text-center my-3 '>
								<button
									className='btn btn-info w-50'
									style={{ fontWeight: "bold", fontSize: "1.1rem" }}
									onClick={downloadPDF}
								>
									Print To PDF
								</button>
							</div>

							{reservation && (
								<div dir='ltr'>
									<ReceiptPDFB2B
										ref={pdfRef}
										reservation={reservation}
										hotelDetails={hotelDetails}
										calculateReservationPeriod={calculateReservationPeriod}
										getTotalAmountPerDay={getTotalAmountPerDay}
									/>
								</div>
							)}
						</Modal>

						<Header>
							<Section>
								{/* Left side of the header */}
								<div className='row'>
									<div className='col-md-6 my-auto'>
										<div className='col-md-6 my-auto'>
											<div>
												{chosenLanguage === "Arabic"
													? "المبلغ الإجمالي"
													: "Total Amount"}
											</div>
											<h4 className='mx-2'>
												{reservation
													? reservation.total_amount.toLocaleString()
													: 0}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h4>
										</div>
										<div className='col-md-12'>
											<h3 style={{ fontSize: "1.5rem", color: "black" }}>
												Confirmation #:{" "}
												{reservation &&
													reservation.customer_details &&
													reservation.confirmation_number}
											</h3>
										</div>
									</div>

									{chosenLanguage === "Arabic" ? (
										<div className='col-md-5 text-center my-auto'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												فاتورة رسمية
											</button>
											<button
												className='mx-2 my-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => {
															sendPaymnetLinkToTheClient(
																linkGenerate,
																reservation.customer_details.email
															).then((data) => {
																if (data && data.error) {
																	console.log(data.error);
																} else {
																	toast.success(
																		"Email Was Successfully Sent to the guest!"
																	);
																}
															});
														}}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${process.env.REACT_APP_MAIN_URL_JANNAT}/client-payment/${reservation._id}/${reservation.confirmation_number}`
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
										</div>
									) : (
										<div className='col-md-4 mx-auto text-center'>
											<button
												className='my-2'
												onClick={() => setIsModalVisible3(true)}
											>
												Invoice
											</button>
											<button
												className='mx-2'
												onClick={() => setIsModalVisible5(true)}
											>
												Operation Order
											</button>
											{linkGenerate ? (
												<>
													<button
														onClick={() => {
															sendPaymnetLinkToTheClient(
																linkGenerate,
																reservation.customer_details.email
															).then((data) => {
																if (data && data.error) {
																	console.log(data.error);
																} else {
																	toast.success(
																		"Email Was Successfully Sent to the guest!"
																	);
																}
															});
														}}
														style={{
															background: "darkgreen",
															border: "1px darkred solid",
														}}
													>
														Email Payment Link To The Client
													</button>
													<br />
													<div
														className='mx-2 mt-2'
														style={{ cursor: "pointer" }}
														onClick={() => {
															setLinkModalVisible(true);
														}}
													>
														Show Link <i className='fa-solid fa-eye'></i>
													</div>
												</>
											) : (
												<button
													style={{
														background: "darkred",
														border: "1px darkred solid",
													}}
													onClick={() => {
														setLinkGenerated(
															`${
																process.env.REACT_APP_MAIN_URL_JANNAT
															}/client-payment/${reservation._id}/${
																reservation._id
															}/${reservation._id}/${
																hotelDetails.hotelName
															}/roomTypes/${reservation._id}/${
																reservation._id
															}/${reservation.days_of_residence}/${Number(
																reservation.total_amount
															).toFixed(2)}`
														);
													}}
												>
													Generate Payment Link
												</button>
											)}
										</div>
									)}

									<div className='col-md-8'></div>
									<div
										className='col-md-3 mx-auto text-center'
										style={{
											// border: "1px solid black",
											textAlign: chosenLanguage === "Arabic" ? "center" : "",
											fontSize: "1.1rem",
											fontWeight: "bold",
										}}
									>
										{chosenLanguage === "Arabic"
											? "حالة الحجز"
											: "Reservation Status"}
										<EditOutlined
											onClick={() => setIsModalVisible(true)}
											style={{
												marginLeft: "5px",
												marginRight: "5px",
												cursor: "pointer",
											}}
										/>
										<div
											className=''
											style={{
												background:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "red"
														: reservation.reservation_status.includes(
																	"checked_out"
														    )
														  ? "darkgreen"
														  : reservation.reservation_status === "inhouse"
														    ? "#c4d3e2"
														    : "yellow",
												color:
													reservation &&
													reservation.reservation_status.includes("cancelled")
														? "white"
														: reservation.reservation_status.includes(
																	"checked_out"
														    )
														  ? "white"
														  : "black",
												textAlign: "center",
												textTransform: "uppercase",
											}}
										>
											{reservation && reservation.reservation_status}
										</div>
									</div>
								</div>
							</Section>

							<Section>
								{/* Right side of the header */}
								<div className='row'>
									<div className='col-md-12'>
										<h3 style={{ fontSize: "2.5rem" }}>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.name}
										</h3>
										<div className='row  my-2'>
											<button
												className='col-md-5'
												onClick={() => {
													sendReservationConfirmationEmail({
														...reservation,
														hotelName: hotelDetails.hotelName,
													}).then((data) => {
														if (data && data.error) {
															toast.error("Failed Sending Email");
														} else {
															toast.success(
																`Email was successfully sent to ${reservation.customer_details.email}`
															);
														}
													});
												}}
											>
												Email
											</button>
											<button className='col-md-5'>SMS</button>
										</div>
									</div>
								</div>
							</Section>
						</Header>
						<HorizontalLine />
						<Content>
							<ContentSection>
								<div
									className='row'
									style={{ fontSize: "17px", fontWeight: "bold" }}
								>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkin_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5'>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check-out"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkout_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-5 mx-auto mt-3'>
										{chosenLanguage === "Arabic"
											? "فترة الحجز"
											: "Reservation Period"}
										<div>
											{reservation
												? calculateReservationPeriod(
														reservation.checkin_date,
														reservation.checkout_date,
														chosenLanguage
												  )
												: ""}
										</div>
									</div>
								</div>

								<div
									className='row mt-5'
									style={{ fontSize: "15px", fontWeight: "bold" }}
								>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										<div className='mx-2'>
											{reservation &&
											reservation.customer_details &&
											reservation.customer_details.nationality
												? reservation.customer_details.nationality
												: "N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Passport #"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.passport) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "نسخة جواز السفر"
											: "Passport Copy #"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details.copyNumber) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Phone"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.phone) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "البريد" : "Email"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.email) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-12 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "تاريخ الميلاد"
											: "Date Of Birth"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.passportExpiry) ||
												"N/A"}
										</div>
									</div>
									{/* <div className='col-md-4 mx-auto text-center mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{(reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality) ||
												"N/A"}
										</div>
									</div> */}
								</div>
								{reservation &&
								reservation.customer_details &&
								reservation.customer_details.carLicensePlate ? (
									<div
										className='row mt-2'
										style={{ fontSize: "15px", fontWeight: "bold" }}
									>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carLicensePlate) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carColor) ||
													"N/A"}
											</div>
										</div>
										<div className='col-md-4 mx-auto text-center mx-auto my-2'>
											{chosenLanguage === "Arabic"
												? "رقم لوحة السيارة"
												: "License Plate"}
											<div className='mx-2'>
												{(reservation &&
													reservation.customer_details.carModel) ||
													"N/A"}
											</div>
										</div>
									</div>
								) : (
									<div
										className='mt-3'
										style={{
											fontSize: "15px",
											fontWeight: "bold",
											textAlign: "center",
										}}
									>
										Guest Doesn't Have A Car!
									</div>
								)}
							</ContentSection>
							<ContentSection>
								<div
									className='row mt-5'
									style={{ fontWeight: "bold", fontSize: "16px" }}
								>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "مصدر الحجز"
											: "Booking Source"}
										<div
											className='mx-1'
											style={{ textTransform: "capitalize" }}
										>
											{reservation && reservation.booking_source}
										</div>
										<div
											className='mx-1'
											style={{ textTransform: "capitalize" }}
										>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.reservedBy}
										</div>
									</div>

									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "تاريخ الحجز"
											: "Booking Date"}
										<div className='mx-1'>
											{reservation && reservation.booked_at
												? new Intl.DateTimeFormat(
														chosenLanguage === "Arabic" ? "ar-EG" : "en-GB",
														{
															year: "numeric",
															month: "2-digit",
															day: "2-digit",
														}
												  ).format(new Date(reservation.booked_at))
												: "N/A"}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "نوع الغرفة"
											: "Reserved Room Types"}
										<div className='mx-1'>
											{reservation.pickedRoomsType.map((room, index) => (
												<div key={index}>
													<div>{room.room_type}</div>
													{room.displayName}
												</div>
											))}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "عدد الزوار"
											: "Count Of Visitors"}
										<div className='mx-1'>
											{reservation && reservation.total_guests}
										</div>
									</div>

									<div className='col-md-8 my-4 mx-auto'>
										{chosenLanguage === "Arabic" ? "ملحوظة" : "Comment"}
										<div>{reservation && reservation.comment}</div>
									</div>

									{chosenRooms && chosenRooms.length > 0 ? (
										<div className='table-responsive'>
											<table
												className='table table-bordered table-hover mx-auto'
												style={{
													textAlign: "center",
													marginTop: "10px",
													width: "90%",
												}}
											>
												<thead className='thead-light'>
													<tr>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Type
														</th>
														<th
															scope='col'
															style={{ width: "50%", fontWeight: "bold" }}
														>
															Room Number
														</th>
													</tr>
												</thead>
												<tbody>
													{chosenRooms.map((room, index) => (
														<tr key={index}>
															<td style={{ textTransform: "capitalize" }}>
																{room.room_type}
															</td>
															<td>{room.room_number}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : null}
								</div>
							</ContentSection>
							<ContentSection>
								<div
									className='row'
									style={{
										maxHeight: "350px",
										overflow: "auto",
										fontSize: "16px",
									}}
								>
									{reservation &&
										reservation.pickedRoomsType.map((room, index) => (
											<React.Fragment key={index}>
												{/* You can add a date here if available */}
												<div className='col-md-4 mt-2'>{/* Date */}</div>
												<div className='col-md-4 mt-2'>{room.room_type}</div>
												<div className='col-md-4 mt-2'>
													{room.chosenPrice.toLocaleString() * room.count}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</div>
											</React.Fragment>
										))}
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2'></div>
									<div className='col-md-4 mt-2 text-center pb-3'>
										<div style={{ fontWeight: "bold", fontSize: "13px" }}>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount"}
										</div>
										<div style={{ fontWeight: "bold" }}>
											{/* Calculation of total amount */}
											{reservation &&
												reservation.total_amount.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>
								<div className='mt-5'>
									{/* Taxes & Extra Fees Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "الضرائب والرسوم"
												: "Taxes & Extra Fees"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{0} {chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* Commission Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic" ? "عمولة" : "Commission"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{computedCommission.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* One Night Cost Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "سعر الليلة الواحدة"
												: "One Night Cost"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{oneNightCost.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>

									{/* Final Deposit Row */}
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "المبلغ المستحق"
												: "Final Deposit"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{finalDeposit.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>

								<div className='my-5'>
									<div className='row my-auto'>
										<div className='col-md-5 mx-auto'>
											<h4>
												{chosenLanguage === "Arabic"
													? "الإجمالى"
													: "Total Amount"}
											</h4>
										</div>
										<div className='col-md-5 mx-auto'>
											<h3>
												{reservation.total_amount.toLocaleString()}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h3>
										</div>

										{reservation && reservation.paid_amount !== 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المودع"
														: "Deposited Amount"}
												</h4>
											</div>
										) : null}

										{reservation && reservation.paid_amount !== 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3>
													{reservation.paid_amount.toLocaleString()}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h3>
											</div>
										) : null}

										{reservation && reservation.paid_amount !== 0 ? (
											<div className='col-md-5 mx-auto'>
												<h4>
													{chosenLanguage === "Arabic"
														? "المبلغ المستحق"
														: "Amount Due"}
												</h4>
											</div>
										) : null}

										{reservation && reservation.paid_amount !== 0 ? (
											<div className='col-md-5 mx-auto'>
												<h3 style={{ color: "darkgreen" }}>
													{Number(
														Number(reservation.total_amount) -
															Number(reservation.paid_amount)
													).toLocaleString()}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h3>
											</div>
										) : null}
									</div>
									<div className='my-3'>
										<div className='row'>
											{reservation?.payment_details?.onsite_paid_amount &&
											reservation?.payment_details?.onsite_paid_amount > 0 ? (
												<div className='col-md-5 mx-auto'>
													<h5
														style={{ color: "darkgreen", fontWeight: "bold" }}
													>
														{chosenLanguage === "Arabic"
															? "Paid Offline"
															: "Paid Offline"}
													</h5>
												</div>
											) : null}
											{reservation?.payment_details?.onsite_paid_amount &&
											reservation?.payment_details?.onsite_paid_amount > 0 ? (
												<div
													className='col-md-5 mx-auto'
													style={{ color: "darkgreen", fontWeight: "bold" }}
												>
													<h5>
														{reservation.payment_details.onsite_paid_amount}{" "}
														{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
													</h5>
												</div>
											) : null}

											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "معدل السعر اليومي"
														: "Daily Rate"}
												</h6>
											</div>

											<div className='col-md-5 mx-auto'>
												<h5>
													{getTotalAmountPerDay(reservation.pickedRoomsType) &&
														getTotalAmountPerDay(
															reservation.pickedRoomsType
														).toLocaleString()}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>

									<div className='my-3'>
										<div className='row'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "معدل السعر الجزري"
														: "Average Daily Root Price"}
												</h6>
											</div>
											<div className='col-md-5 mx-auto'>
												<h5>
													{getAverageRootPrice(
														reservation.pickedRoomsType
													).toFixed(2)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>
									<div className='my-3'>
										<div className='row my-3'>
											<div className='col-md-5 mx-auto'>
												<h6>
													{chosenLanguage === "Arabic"
														? "إجمالي السعر الجزري"
														: "Overall Total with Root Price"}
												</h6>
											</div>
											<div className='col-md-5 mx-auto'>
												<h5>
													{calculateOverallTotalRootPrice(
														reservation.pickedRoomsType
													).toFixed(2)}{" "}
													{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
												</h5>
											</div>
										</div>
									</div>
								</div>
							</ContentSection>
						</Content>
					</div>
				</div>
			)}

			<PaymentTrigger reservation={reservation} />
		</Wrapper>
	);
};

export default MoreDetails;
