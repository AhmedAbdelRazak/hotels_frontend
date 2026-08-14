import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { DatePicker, Spin } from "antd";
import HotelOverviewReservation from "./HotelOverviewReservation";
import moment from "moment";
import { toast } from "react-toastify";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
} from "../HotelModule/apiAdmin";
import { isAuthenticated } from "../auth";

const ZReservationForm = ({
	customer_details,
	setCustomer_details,
	start_date,
	setStart_date,
	end_date,
	setEnd_date,
	disabledDate,
	chosenLanguage,
	hotelDetails,
	hotelRooms,
	values,
	setPickedHotelRooms,
	pickedHotelRooms,
	clickSubmit,
	total_amount,
	setTotal_Amount,
	days_of_residence,
	setDays_of_residence,
	setPickedRoomPricing,
	pickedRoomPricing,
	allReservations,
	setBookingComment,
	booking_comment,
	setBookingSource,
	booking_source,
	payment_status,
	setConfirmationNumber,
	confirmation_number,
	setPaymentStatus,
	searchQuery,
	setSearchQuery,
	searchClicked,
	setSearchClicked,
	searchedReservation,
	pickedRoomsType,
	setPickedRoomsType,
	finalTotalByRoom,
	isBoss,
	start_date_Map,
	end_date_Map,
}) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);
	const [taskeenClicked, setTaskeenClicked] = useState(false);

	const [isFixed, setIsFixed] = useState(false);

	const { user } = isAuthenticated();

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollPos = window.pageYOffset;
			if (currentScrollPos > 750) {
				setIsFixed(true);
			} else if (currentScrollPos < 750) {
				setIsFixed(false);
			}
		};

		window.addEventListener("scroll", handleScroll);

		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	const onStartDateChange = (value) => {
		// Convert 'value' to a Date object at midnight to disregard time
		const dateAtMidnight = value ? value.clone().startOf("day").toDate() : null;

		setStart_date(dateAtMidnight ? dateAtMidnight.toISOString() : null);

		// Check if end_date is already set
		if (dateAtMidnight && end_date) {
			const adjustedEndDate = moment(end_date).startOf("day").toDate();

			// Calculate the difference in days
			const duration = moment(adjustedEndDate).diff(
				moment(dateAtMidnight),
				"days"
			);

			// Update days_of_residence accordingly, ensuring it's at least 1 day
			setDays_of_residence(duration >= 0 ? duration + 1 : 0); // Add 1 to include both start and end dates in the count
		} else {
			// Optionally reset days_of_residence if no end_date
			setDays_of_residence(0);
		}
	};

	// const onStartDateChange = (date, dateString) => {
	// 	setStart_date(dateString); // Update the start date
	// };

	const onEndDateChange = (date) => {
		// Convert 'date' to a Date object at midnight to disregard time
		const adjustedEndDate = date ? date.clone().startOf("day").toDate() : null;

		setEnd_date(adjustedEndDate ? adjustedEndDate.toISOString() : null);

		// Calculate days_of_residence if start_date is set
		if (adjustedEndDate && start_date) {
			const adjustedStartDate = moment(start_date).startOf("day").toDate();

			// Calculate the difference in days
			const duration = moment(adjustedEndDate).diff(
				moment(adjustedStartDate),
				"days"
			);

			// Update days_of_residence accordingly, ensuring it's at least 1 day
			setDays_of_residence(duration >= 0 ? duration + 1 : 0); // Add 1 to include both start and end dates in the count
		} else {
			// Optionally reset days_of_residence if no start_date
			setDays_of_residence(0);
		}
	};

	const disabledEndDate = (current) => {
		// Disables all dates before the start date or today's date (whichever is later)
		return current && current < moment(start_date).startOf("day");
	};

	const handleTaskeenClicked = () => {
		if (!customer_details.name) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال اسم الزائر"
					: "Name is required"
			);
		}
		if (!customer_details.phone) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال رقم هاتف الزائر"
					: "Phone is required"
			);
		}
		if (!customer_details.passport) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال رقم جواز الزائر"
					: "passport is required"
			);
		}
		if (!customer_details.nationality) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال جنسية الزائر"
					: "nationality is required"
			);
		}
		if (!start_date) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال تاريخ وصول الزائر"
					: "Check in Date is required"
			);
		}

		if (!end_date) {
			return toast.error(
				chosenLanguage === "Arabic"
					? "الرجاء إدخال تاريخ مغادرة الزائر"
					: "Check out Date is required"
			);
		}
		setTaskeenClicked(true);
		setTimeout(() => {
			window.scrollTo({ top: 760, behavior: "smooth" });
		}, 1000);
	};

	const handleFileUpload = (uploadFunction) => {
		// Ask the user if the upload is from the US
		const isFromUS = window.confirm(
			"Is this upload from the US? Click OK for Yes, Cancel for No."
		);

		// Determine the country parameter based on user response
		const country = isFromUS ? "US" : "NotUS";

		const accountId = hotelDetails._id; // Get the account ID
		const belongsTo = user._id;
		const fileInput = document.createElement("input");
		fileInput.type = "file";
		fileInput.accept =
			".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"; // Accept Excel and CSV files
		fileInput.onchange = (e) => {
			setLoading(true);
			const file = e.target.files[0];
			uploadFunction(accountId, belongsTo, file, country).then((data) => {
				setLoading(false);
				if (data.error) {
					console.log(data.error);
					toast.error("Error uploading data");
				} else {
					toast.success("Data uploaded successfully!");
				}
			});
		};
		fileInput.click(); // Simulate a click on the file input
	};

	console.log(finalTotalByRoom(), "finalTotalByRoom");
	return (
		<ZReservationFormWrapper
			arabic={chosenLanguage === "Arabic"}
			is_Fixed={isFixed}
		>
			{loading ? (
				<>
					<div className='text-center my-5'>
						<Spin size='large' />
						<p>
							{" "}
							{chosenLanguage === "Arabic" ? "" : ""} Loading Reservations...
						</p>
					</div>
				</>
			) : (
				<>
					{isBoss ? (
						<div className='mx-auto mb-5 mt-4 text-center'>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(agodaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات أجودا"
									: "Agoda Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(expediaData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات إكسبيديا"
									: "Expedia Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(bookingData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات بوكينج"
									: "Booking Upload"}
							</button>
							<button
								className='btn btn-primary mx-2'
								style={{ fontWeight: "bold" }}
								onClick={() => handleFileUpload(airbnbData)}
							>
								{chosenLanguage === "Arabic"
									? "رفع بيانات Airbnb"
									: "Airbnb Upload"}
							</button>
						</div>
					) : null}

					<div className='row'>
						<div className='col-md-8'>
							<div className='my-3'>
								<div className='row'>
									<div className='col-md-9 my-auto'>
										<input
											type='text'
											className='form-control'
											placeholder={
												chosenLanguage === "Arabic"
													? "البحث بالاسم، رقم جواز السفر، رقم التأكيد"
													: "search by name, passport #, confirmation #"
											}
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>
									<div
										className='col-md-3 my-auto'
										onClick={() => {
											setSearchClicked(!searchClicked);
										}}
									>
										<button className='btn btn-success'>
											{" "}
											{chosenLanguage === "Arabic" ? "البحث..." : "Search..."}
										</button>
									</div>
								</div>
							</div>

							<div className='row'>
								<div className='col-md-4'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic" ? "الاسم" : "Guest Name"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.name}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													name: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='col-md-4'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.phone}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													phone: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='col-md-4'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "البريد الإلكتروني"
												: "Guest Email"}{" "}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.email}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													email: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic"
												? "رقم جواز السفر"
												: "Guest Passport #"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.passport}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													passport: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{" "}
											{chosenLanguage === "Arabic"
												? "نسخة جواز السفر   "
												: "Passport Copy #"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.copyNumber}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													copyNumber: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "تاريخ الميلاد"
												: "Date Of Birth"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.passportExpiry}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													passportExpiry: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div className='col-md-3'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
										</label>
										<input
											background='red'
											type='text'
											value={customer_details.nationality}
											onChange={(e) =>
												setCustomer_details({
													...customer_details,
													nationality: e.target.value,
												})
											}
										/>
									</div>
								</div>

								<div
									className={
										customer_details.hasCar === "yes"
											? "col-md-4"
											: "col-md-8 mx-auto"
									}
								>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "هل لدى الضيف سيارة؟"
												: "Does The Guest Have A Car?"}
										</label>
										<div>
											<div
												className='mx-3'
												style={{ display: "inline-block", marginRight: "10px" }}
											>
												<input
													type='radio'
													name='hasCar'
													value='yes'
													checked={customer_details.hasCar === "yes"}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															hasCar: e.target.value,
														})
													}
												/>
												{chosenLanguage === "Arabic" ? "نعم" : "Yes"}
											</div>
											<div style={{ display: "inline-block" }}>
												<input
													type='radio'
													name='hasCar'
													value='no'
													checked={customer_details.hasCar === "no"}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															hasCar: e.target.value,
														})
													}
												/>
												{chosenLanguage === "Arabic" ? "لا" : "No"}
											</div>
										</div>
									</div>
								</div>
								{customer_details.hasCar === "yes" && (
									<>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "رقم لوحة السيارة"
														: "License Plate"}
												</label>
												<input
													type='text'
													value={customer_details.carLicensePlate}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carLicensePlate: e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "لون السيارة"
														: "Car Color"}
												</label>
												<input
													type='text'
													value={customer_details.carColor}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carColor: e.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='col-md-2'>
											<div
												className='form-group'
												style={{ marginTop: "10px", marginBottom: "10px" }}
											>
												<label style={{ fontWeight: "bold" }}>
													{chosenLanguage === "Arabic"
														? "موديل/نوع السيارة"
														: "Car Model"}
												</label>
												<input
													type='text'
													value={customer_details.carModel}
													onChange={(e) =>
														setCustomer_details({
															...customer_details,
															carModel: e.target.value,
														})
													}
												/>
											</div>
										</div>
									</>
								)}

								<div className='col-md-6'>
									<label
										className='dataPointsReview mt-3'
										style={{
											fontWeight: "bold",
											fontSize: "1.05rem",
											color: "#32322b",
										}}
									>
										{chosenLanguage === "Arabic"
											? "تاريخ الوصول"
											: "Checkin Date"}{" "}
										{start_date
											? `(${new Date(start_date).toDateString()})`
											: ""}
									</label>
									<br />
									<DatePicker
										className='inputFields'
										disabledDate={disabledDate}
										inputReadOnly
										size='small'
										showToday={true}
										placeholder='Please pick the desired schedule checkin date'
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
										onChange={onStartDateChange}
									/>
								</div>

								<div className='col-md-6'>
									<label
										className='dataPointsReview mt-3'
										style={{
											fontWeight: "bold",
											fontSize: "1.05rem",
											color: "#32322b",
										}}
									>
										{chosenLanguage === "Arabic"
											? "موعد انتهاء الأقامة"
											: "Checkout Date"}{" "}
										{end_date ? `(${new Date(end_date).toDateString()})` : ""}
									</label>
									<br />
									<DatePicker
										className='inputFields'
										disabledDate={disabledEndDate}
										inputReadOnly
										size='small'
										showToday={true}
										placeholder='Please pick the desired schedule checkout date'
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
										onChange={onEndDateChange}
									/>
								</div>
							</div>

							<div
								className='row my-4 mx-auto'
								style={{
									background: "#d3d3d3",
									width: "99%",
									minHeight: "250px",
								}}
							>
								<div className='col-md-6 mx-auto my-2'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "مصدر الحجز"
												: "Booking Source"}
										</label>
										<select
											onChange={(e) => setBookingSource(e.target.value)}
											style={{
												height: "auto",
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										>
											<option value=''>
												{booking_source ? booking_source : "Please Select"}
											</option>
											<option value='janat'>Janat</option>
											<option value='affiliate'>Affiliate</option>
											<option value='manual'>Manual Reservation</option>
											<option value='agoda'>Agoda</option>
											<option value='booking.com'>Booking.com</option>
											<option value='trivago'>Trivago</option>
											<option value='expedia'>Expedia</option>
											<option value='trip.com'>Trip.com</option>
											<option value='hotel.com'>Hotel.com</option>
											<option value='airbnb'>Airbnb</option>
										</select>
									</div>
								</div>

								{booking_source !== "manual" && booking_source && (
									<div className='col-md-6 mx-auto my-2'>
										<div
											className='form-group'
											style={{
												marginTop: "10px",
												marginBottom: "10px",
												fontWeight: "bold",
											}}
										>
											<label style={{ fontWeight: "bold" }}>
												{chosenLanguage === "Arabic"
													? "رقم التأكيد"
													: "Confirmation #"}
											</label>
											<input
												background='red'
												type='text'
												value={confirmation_number}
												onChange={(e) => setConfirmationNumber(e.target.value)}
											/>
										</div>
									</div>
								)}

								<div className='col-md-6 mx-auto my-auto'>
									<div className='form-group'>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "طريقة الدفع او السداد"
												: "Payment"}
										</label>
										<select
											onChange={(e) => setPaymentStatus(e.target.value)}
											style={{
												height: "auto",
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										>
											<option value=''>
												{searchedReservation && searchedReservation.payment
													? searchedReservation.payment
													: "Please Select"}
											</option>
											<option value='not paid'>Not Paid</option>
											<option value='credit/ debit'>Credit/ Debit</option>
											<option value='cash'>Cash</option>
										</select>
									</div>
								</div>

								<div className='col-md-6 mx-auto my-2'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
										</label>
										<textarea
											background='red'
											cols={6}
											type='text'
											value={booking_comment}
											onChange={(e) => setBookingComment(e.target.value)}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className='col-md-4 taskeen'>
							<h4 className='my-2'>
								{chosenLanguage === "Arabic"
									? "حجز غرفة للضيف"
									: "Reserve A Room For The Guest"}
							</h4>
							<div
								className='row'
								style={{
									textTransform: "capitalize",
									fontWeight: "bold",
									padding: "10px",
								}}
							>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic"
										? "رقم التأكيد"
										: "Confirmation #"}
								</div>

								<div className='col-md-6 my-2'>{confirmation_number}</div>

								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
									<div style={{ background: "#bfbfbf", padding: "2px" }}>
										{start_date ? `${new Date(start_date).toDateString()}` : ""}
									</div>
								</div>

								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Departure"}
									<div style={{ background: "#bfbfbf", padding: "2px" }}>
										{end_date ? `${new Date(end_date).toDateString()}` : ""}
									</div>
								</div>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "طريقة الدفع" : "Payment"}
								</div>
								<div
									className='col-md-4 mx-auto my-2 '
									style={{
										background: "darkred",
										color: "white",
										textTransform: "uppercase",
									}}
								>
									{searchedReservation.payment === payment_status
										? payment_status
										: searchedReservation.payment
										  ? searchedReservation.payment
										  : payment_status}
								</div>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "حالة الحجز" : "Status"}
								</div>
								<div
									className='col-md-3 mx-auto my-2 '
									style={{ background: "darkgreen", color: "white" }}
								>
									{searchedReservation &&
										searchedReservation.reservation_status}
								</div>
							</div>
							<h4 className='my-4 text-center' style={{ color: "#006ad1" }}>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount:"}{" "}
								{searchedReservation && searchedReservation.confirmation_number
									? searchedReservation.total_amount.toLocaleString()
									: finalTotalByRoom()
									  ? finalTotalByRoom()
									  : 0}{" "}
								{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
							</h4>
							{searchedReservation &&
							Number(searchedReservation.paid_amount) > 0 ? (
								<h4 className='my-4 text-center' style={{ color: "#006ad1" }}>
									{chosenLanguage === "Arabic"
										? "المبلغ المودع"
										: "Deposited Amount:"}{" "}
									{searchedReservation &&
										Number(
											searchedReservation.paid_amount
										).toLocaleString()}{" "}
									{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
								</h4>
							) : null}
							{searchedReservation &&
							Number(searchedReservation.paid_amount) > 0 &&
							searchedReservation.confirmation_number &&
							searchedReservation.total_amount ? (
								<h4 className='my-4 text-center' style={{ color: "darkgreen" }}>
									{chosenLanguage === "Arabic"
										? "المبلغ المستحق"
										: "Amount Due:"}{" "}
									{Number(
										Number(searchedReservation.total_amount) -
											Number(searchedReservation.paid_amount)
									).toLocaleString()}{" "}
									{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
								</h4>
							) : null}
							<div className='text-center mx-auto'>
								<button
									className='btn btn-info'
									style={{ fontWeight: "bold", fontSize: "1.2rem" }}
									onClick={() => {
										handleTaskeenClicked();
									}}
								>
									{chosenLanguage === "Arabic"
										? "تسكين الان..."
										: "Check The Guest In..."}
								</button>
							</div>
							<>
								{customer_details.name &&
								start_date &&
								end_date &&
								searchedReservation &&
								searchedReservation.pickedRoomsType &&
								searchedReservation.pickedRoomsType.length > 0 ? (
									<>
										<div className='total-amount my-3'>
											{chosenLanguage === "Arabic" ? (
												<h5 style={{ fontWeight: "bold" }}>
													أيام الإقامة: {days_of_residence} يوم /
													{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
													ليالي
												</h5>
											) : (
												<h5 style={{ fontWeight: "bold" }}>
													Days Of Residence: {days_of_residence} Days /{" "}
													{days_of_residence <= 1 ? 1 : days_of_residence - 1}{" "}
													Nights
												</h5>
											)}

											<h5>
												{chosenLanguage === "Arabic"
													? "المبلغ الإجمالي ليوم واحد:"
													: "Total Amount Per Day:"}{" "}
												{searchedReservation &&
												searchedReservation.confirmation_number &&
												days_of_residence
													? (
															searchedReservation.total_amount /
															(days_of_residence - 1)
													  ).toLocaleString()
													: finalTotalByRoom()
													  ? Number(
																finalTotalByRoom() / (days_of_residence - 1)
													    ).toFixed(2)
													  : 0}{" "}
												{chosenLanguage === "Arabic"
													? "ريال سعودي/ يوم"
													: "SAR/ Day"}
											</h5>

											{chosenLanguage === "Arabic" ? (
												<div className='room-list my-3'>
													{searchedReservation &&
														searchedReservation.pickedRoomsType &&
														searchedReservation.pickedRoomsType.map(
															(room, index) => (
																<div
																	key={index}
																	className='room-item my-2'
																	style={{
																		fontWeight: "bold",
																		textTransform: "capitalize",
																	}}
																>
																	{`نوع الغرفة: ${
																		room.room_type
																	}، السعر: ${room.chosenPrice.toLocaleString()} ريال سعودي، العدد: ${
																		room.count
																	} غرف`}
																</div>
															)
														)}
												</div>
											) : (
												<div className='room-list my-3'>
													{searchedReservation &&
														searchedReservation.pickedRoomsType.map(
															(room, index) => (
																<div
																	key={index}
																	className='room-item my-2'
																	style={{
																		fontWeight: "bold",
																		textTransform: "capitalize",
																	}}
																>
																	{`Room Type: ${room.room_type}, Price: ${room.chosenPrice} SAR, Count: ${room.count} Rooms`}
																</div>
															)
														)}
												</div>
											)}
										</div>
									</>
								) : null}
							</>
						</div>
					</div>

					{customer_details.name && start_date && end_date && taskeenClicked ? (
						<>
							<div
								className={isFixed ? "fixed-section visible" : "fixed-section"}
							>
								<div className='review-grid'>
									{customer_details.name &&
									start_date &&
									end_date &&
									searchedReservation &&
									searchedReservation.pickedRoomsType &&
									searchedReservation.pickedRoomsType.length > 0 ? (
										<div
											style={{
												borderLeft: "1px white solid",
												paddingRight: "10px",
												maxHeight: "100px",
												overflow: "auto",
											}}
										>
											{searchedReservation &&
												searchedReservation.pickedRoomsType &&
												searchedReservation.pickedRoomsType.map(
													(room, index) => (
														<div key={index} className='inner-grid'>
															{index === 0 ? (
																<div>
																	<div>
																		{customer_details && customer_details.name}
																	</div>
																	<div className='mx-auto mt-2'>
																		{chosenLanguage === "Arabic"
																			? "رقم التأكيد"
																			: "Confirmation #"}
																		: {confirmation_number}
																	</div>
																</div>
															) : (
																<div></div>
															)}

															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "أنواع الغرف:"
																			: "Room Types:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		textTransform: "capitalize",
																	}}
																>
																	{room.room_type}
																</div>
															</div>

															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "	عدد الغرف:"
																			: "Room Count:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																	}}
																>
																	{room.count}
																</div>
															</div>
															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "السعر في اليوم الواحد:"
																			: "Price/ Day:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																	}}
																>
																	{room.chosenPrice.toLocaleString()}
																</div>
															</div>
														</div>
													)
												)}
										</div>
									) : null}

									<div
										style={{
											borderRight: "1px white solid",
											paddingRight: "10px",
											maxHeight: "100px",
											overflow: "auto",
										}}
									>
										<div
											style={{
												borderLeft: "1px white solid",
												paddingRight: "10px",
											}}
										>
											{pickedHotelRooms &&
												pickedRoomPricing &&
												pickedRoomPricing.length > 0 &&
												pickedHotelRooms.length > 0 &&
												hotelRooms
													.filter((room) => pickedHotelRooms.includes(room._id))
													.map((room, index) => (
														<div key={index} className='inner-grid'>
															<div></div>

															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "أنواع الغرف:"
																			: "Room Types:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																		textTransform: "capitalize",
																	}}
																>
																	{room.room_type}
																	<div
																		style={{
																			color: "red",
																			fontWeight: "bold",
																			float: "right",
																			cursor: "pointer",
																		}}
																	>
																		X
																	</div>{" "}
																</div>
															</div>

															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "	عدد الغرف:"
																			: "Room Count:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																	}}
																>
																	1
																</div>
															</div>
															<div>
																{index === 0 ? (
																	<div>
																		{chosenLanguage === "Arabic"
																			? "السعر في اليوم الواحد:"
																			: "Price/ Day:"}{" "}
																	</div>
																) : null}

																<div
																	className='mx-auto mt-1'
																	style={{
																		background: "white",
																		width: "85%",
																		padding: "5px",
																	}}
																>
																	{pickedRoomPricing &&
																		pickedRoomPricing[index] &&
																		pickedRoomPricing[index].chosenPrice}
																</div>
															</div>
														</div>
													))}
										</div>
									</div>
								</div>
								<div className='px-5 py-1' style={{ marginRight: "25%" }}>
									<button
										className='btn btn-success px-5 py-0'
										onClick={() => {
											clickSubmit();
										}}
										style={{ fontWeight: "bold", fontSize: "1.2rem" }}
									>
										{chosenLanguage === "Arabic"
											? "احجز الان..."
											: "Reserve Now..."}
									</button>
									{total_amount && days_of_residence && searchedReservation ? (
										<h4
											className='mt-3'
											style={{
												fontWeight: "bold",
												color:
													(
														searchedReservation &&
														total_amount * (days_of_residence - 1)
													).toFixed(2) !==
													searchedReservation.total_amount.toFixed(2)
														? "red"
														: "#3d7bb8",
											}}
										>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount:"}{" "}
											{Number(total_amount * (days_of_residence - 1))}{" "}
											{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
										</h4>
									) : null}

									{!searchedReservation &&
									!searchedReservation.confirmation_number &&
									finalTotalByRoom() ? (
										<h4
											className='mt-3'
											style={{
												fontWeight: "bold",
												color: "#3d7bb8",
											}}
										>
											{chosenLanguage === "Arabic"
												? "المبلغ الإجمالي"
												: "Total Amount:"}{" "}
											{searchedReservation &&
											searchedReservation.confirmation_number
												? searchedReservation.total_amount.toLocaleString()
												: finalTotalByRoom()
												  ? finalTotalByRoom()
												  : 0}
											{chosenLanguage === "Arabic" ? "ريال سعودي" : "SAR"}
										</h4>
									) : null}
								</div>
							</div>

							<div className='col-md-8 mx-auto mt-5'>
								<hr />
							</div>

							<h4>
								{chosenLanguage === "Arabic"
									? "يرجى اختيار الغرف"
									: "Pick Up A Room"}
							</h4>
							<h5>
								{chosenLanguage === "Arabic"
									? "الرجاء الضغط أدناه في الفندق لاختيار غرفة:"
									: "Please Click Here To Pick A Room:"}
							</h5>

							<HotelOverviewReservation
								hotelDetails={hotelDetails}
								hotelRooms={hotelRooms}
								values={values}
								setPickedHotelRooms={setPickedHotelRooms}
								pickedHotelRooms={pickedHotelRooms}
								total_amount={total_amount}
								setTotal_Amount={setTotal_Amount}
								clickSubmit={clickSubmit}
								pickedRoomPricing={pickedRoomPricing}
								setPickedRoomPricing={setPickedRoomPricing}
								allReservations={allReservations}
								start_date={start_date}
								end_date={end_date}
								chosenLanguage={chosenLanguage}
								pickedRoomsType={pickedRoomsType}
								setPickedRoomsType={setPickedRoomsType}
								searchedReservation={searchedReservation}
								start_date_Map={start_date_Map}
								end_date_Map={end_date_Map}
							/>
						</>
					) : null}
				</>
			)}
		</ZReservationFormWrapper>
	);
};

export default ZReservationForm;

const ZReservationFormWrapper = styled.div`
	margin-top: 40px;
	margin-right: ${(props) => (props.is_Fixed ? "" : "20px")};

	h4 {
		font-size: 1.35rem;
		font-weight: bolder;
	}

	h5 {
		font-size: 1.2rem;
		font-weight: bold;
		text-decoration: underline;
		cursor: pointer;
		margin-top: 20px;
	}

	input[type="text"],
	input[type="email"],
	input[type="password"],
	input[type="date"],
	select,
	textarea {
		display: block;
		width: 100%;
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #ccc;
	}
	input[type="text"]:focus,
	input[type="email"]:focus,
	input[type="password"]:focus,
	input[type="date"]:focus,
	select:focus,
	textarea:focus,
	label:focus {
		outline: none;
		border: 1px solid var(--primaryColor);

		box-shadow: 5px 8px 3px 0px rgba(0, 0, 0, 0.3);
		transition: var(--mainTransition);
		font-weight: bold;
	}

	.taskeen {
		background-color: white;
		min-height: 250px;
		border-radius: 5px;
	}

	text-align: ${(props) => (props.arabic ? "right" : "")};

	label,
	div {
		text-align: ${(props) => (props.arabic ? "right" : "")};
	}

	.review-grid {
		display: grid;
		grid-template-columns: 35% 35%;
		padding: 20px;
	}

	.fixed-section {
		position: fixed;
		top: 0;
		width: 100%;
		background-color: darkgrey;
		z-index: 10;
		opacity: 0; // Start with the section being transparent
		transition: opacity 0.5s ease-in-out; // Smooth transition for opacity
	}

	.visible {
		opacity: 1; // Fully visible when the class 'visible' is added
	}

	.inner-grid {
		display: grid;
		grid-template-columns: 160px 150px 150px 150px;
	}

	.inner-grid > div > div {
		text-align: center;
		font-weight: bold;
	}
`;
