import React, { useState } from "react";
import styled from "styled-components";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { Spin, Modal, Select } from "antd";
import moment from "moment";
import { EditOutlined } from "@ant-design/icons";
import {
	sendReservationConfirmationEmail,
	updateSingleReservation,
} from "../apiAdmin";
import { toast } from "react-toastify";
import { EditReservationMain } from "./EditWholeReservation/EditReservationMain";

const Wrapper = styled.div`
	min-height: 750px;
	margin-top: 30px;
	text-align: ${(props) => (props.isArabic ? "right" : "")};
`;

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 120px;
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

const ReservationDetail = ({ reservation, setReservation, hotelDetails }) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isModalVisible2, setIsModalVisible2] = useState(false);

	// eslint-disable-next-line
	const [selectedStatus, setSelectedStatus] = useState("");

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
		const checkinDate = moment(checkin).locale(
			language === "Arabic" ? "ar" : "en"
		);
		const checkoutDate = moment(checkout).locale(
			language === "Arabic" ? "ar" : "en"
		);
		console.log(checkinDate.toString(), checkoutDate.toString()); // Debugging

		const duration = moment.duration(checkoutDate.diff(checkinDate));
		const days = duration.asDays();
		console.log("Duration in days:", days); // Debugging

		const daysText = language === "Arabic" ? "أيام" : "days";
		const nightsText = language === "Arabic" ? "ليال" : "nights";
		return `${days} ${daysText} / ${days - 1} ${nightsText}`;
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
			};

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
							left: chosenLanguage === "Arabic" ? "1%" : "auto",
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
								? "تعدين الحجز"
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
							}}
							onClick={() => {
								setIsModalVisible2(true);
							}}
						>
							<EditOutlined />
							{chosenLanguage === "Arabic" ? "تعديل الحجز" : "Edit Reservation"}
						</h5>
						<Header>
							<Section>
								{/* Left side of the header */}
								<div className='row'>
									<div className='col-md-6'>
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
									{chosenLanguage === "Arabic" ? (
										<div className='col-md-6 mx-auto text-center'>
											<button className='my-2'>فاتورة رسمية</button>
											<button>كشف حساب</button>
										</div>
									) : (
										<div className='col-md-6 mx-auto text-center'>
											<button className='my-2'>Invoice</button>
											<button>Account Statement</button>
										</div>
									)}
								</div>
							</Section>
							<Section>
								{/* Right side of the header */}
								<div className='row'>
									<div className='col-md-9'>
										<h3>
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

									<div
										className={
											reservation && reservation.confirmation_number.length <= 8
												? "col-md-3"
												: "col-md-8 mt-1"
										}
									>
										<div style={{ fontSize: "11px", fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "رقم التأكيد"
												: "Confirmation"}
										</div>
										<div className='mt-2 ml-2' style={{ fontWeight: "bold" }}>
											{reservation && reservation.confirmation_number}
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
									style={{ maxHeight: "350px", overflow: "auto" }}
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
									<div className='row' style={{ fontWeight: "bold" }}>
										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic"
												? "الضرائب والرسوم "
												: "Taxes & Extra Fees"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{0} {chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>

										<div className='col-md-5 mx-auto text-center my-2'>
											{chosenLanguage === "Arabic" ? "عمولة" : "Commision"}
										</div>
										<div className='col-md-5 mx-auto text-center my-2'>
											{reservation &&
												reservation.commission &&
												reservation.commission.toLocaleString()}{" "}
											{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
										</div>
									</div>
								</div>

								<div className='my-5'>
									<div className='row my-auto'>
										<div className='col-md-5 mx-auto'>
											<h4>
												{chosenLanguage === "Arabic"
													? "حصة الفندق"
													: "Hotel Share"}
											</h4>
										</div>
										<div className='col-md-5 mx-auto'>
											<h2>
												{reservation.total_amount.toLocaleString()}{" "}
												{chosenLanguage === "Arabic" ? "ريال" : "SAR"}
											</h2>
										</div>
									</div>
									<div className='my-3'>
										<div className='row'>
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
								</div>
							</ContentSection>
							<ContentSection>
								<div className='row mt-5' style={{ fontWeight: "bold" }}>
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

									<div className='col-md-4'>
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
											className='mx-1'
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

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "نوع الغرفة"
											: "Reserved Room Types"}
										<div className='mx-1'>
											{reservation.pickedRoomsType.map((room, index) => (
												<div key={index}>{room.room_type}</div>
											))}
										</div>
									</div>

									<div className='col-md-4 my-5 mx-auto'>
										{chosenLanguage === "Arabic"
											? "عدد الزوار"
											: "Count Of Visitors"}
										<div className='mx-1'>
											{reservation && reservation.pickedRoomsType.length}
										</div>
									</div>

									<div className='col-md-8 my-4 mx-auto'>
										{chosenLanguage === "Arabic" ? "ملحوظة" : "Comment"}
										<div>{reservation && reservation.comment}</div>
									</div>
								</div>
							</ContentSection>
							<ContentSection>
								<div
									className='row'
									style={{ fontSize: "13px", fontWeight: "bold" }}
								>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic" ? "الوصول" : "Arrival"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkin_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-4'>
										{chosenLanguage === "Arabic"
											? "تاريخ المغادرة"
											: "Check-out"}
										<div style={{ border: "1px solid black", padding: "3px" }}>
											{moment(reservation && reservation.checkout_date)
												.locale(chosenLanguage === "Arabic" ? "ar" : "en")
												.format("DD/MM/YYYY")}
										</div>
									</div>
									<div className='col-md-4 my-auto'>
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
									style={{ fontSize: "13px", fontWeight: "bold" }}
								>
									<div className='col-md-5 mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										<div className='mx-2'>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality}
										</div>
									</div>
									<div className='col-md-5 mx-auto my-2'>
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Passport #"}
										<div className='mx-2'>
											{(reservation && reservation.customer_details.passport) ||
												"N/A"}
										</div>
									</div>
									<div className='col-md-5 mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "الهاتف" : "Phone"}
										<div className='mx-2'>
											{reservation && reservation.customer_details.phone}
										</div>
									</div>
									<div className='col-md-5 mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "البريد" : "Email"}
										<div className='mx-2'>
											{reservation && reservation.customer_details.email}
										</div>
									</div>
									<div className='col-md-5 mx-auto my-2'>
										{chosenLanguage === "Arabic" ? "العنوان" : "Address"}
										<div className='mx-2'>
											{reservation &&
												reservation.customer_details &&
												reservation.customer_details.nationality}
										</div>
									</div>
								</div>
							</ContentSection>
						</Content>
					</div>
				</div>
			)}
		</Wrapper>
	);
};

export default ReservationDetail;
