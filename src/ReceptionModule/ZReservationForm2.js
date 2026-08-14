import React, { useState } from "react";
import styled from "styled-components";
import { DatePicker, Spin } from "antd";
import moment from "moment";
import { Modal, InputNumber } from "antd";
import {
	agodaData,
	airbnbData,
	bookingData,
	expediaData,
} from "../HotelModule/apiAdmin";
import { toast } from "react-toastify";
import { isAuthenticated } from "../auth";

const ZReservationForm2 = ({
	customer_details,
	setCustomer_details,
	start_date,
	setStart_date,
	end_date,
	setEnd_date,
	disabledDate,
	hotelDetails,
	chosenLanguage,
	hotelRooms,
	pickedHotelRooms,
	clickSubmit2,
	total_amount,
	days_of_residence,
	setDays_of_residence,
	setBookingComment,
	booking_comment,
	setBookingSource,
	setPaymentStatus,
	paymentStatus,
	roomsSummary,
	confirmation_number,
	setConfirmationNumber,
	booking_source,
	clickedMenu,
	pickedRoomsType,
	setPickedRoomsType,
	roomInventory,
	total_guests,
	setTotalGuests,
	setSendEmail,
	sendEmail,
	paidAmount,
	setPaidAmount,
	isBoss,
}) => {
	const [selectedRoomType, setSelectedRoomType] = useState("");
	const [selectedPriceOption, setSelectedPriceOption] = useState("");
	const [selectedCount, setSelectedCount] = useState("");

	const [isModalVisible, setIsModalVisible] = useState(false);
	const [loading, setLoading] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(0);
	const [updatedRoomPrice, setUpdatedRoomPrice] = useState(0);

	const { user } = isAuthenticated();

	const openModal = (room, index) => {
		setIsModalVisible(true);
		setSelectedRoomIndex(index);
		setUpdatedRoomCount(room.count);
		setUpdatedRoomPrice(room.chosenPrice); // Set the current price here
	};

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

	const handleRoomTypeChange = (e) => {
		setSelectedRoomType(e.target.value);
		setSelectedPriceOption(""); // Reset the selected price option
		setSelectedCount(""); // Reset the count
	};

	const handlePriceOptionChange = (e) => {
		const value = e.target.value;
		console.log("Selected Price Option:", value); // Debugging line
		setSelectedPriceOption(value);
		if (value !== "custom") {
			setUpdatedRoomPrice(value);
		} else {
			// Reset or set a default value for custom price
			setUpdatedRoomPrice(0);
		}
	};

	const handleRoomCountChange = (e) => {
		setSelectedCount(e.target.value);
	};

	const addRoomToReservation = () => {
		if (!selectedRoomType || !selectedPriceOption || !selectedCount) {
			alert("Please complete the room selection.");
			return;
		}

		// Determine the chosen price - use the custom price if 'custom' is selected
		const chosenPrice =
			selectedPriceOption === "custom"
				? parseFloat(updatedRoomPrice)
				: parseFloat(selectedPriceOption);

		setPickedRoomsType((prev) => {
			// Check if room type with the same price already exists
			const existingRoomIndex = prev.findIndex(
				(item) =>
					item.room_type === selectedRoomType &&
					parseFloat(item.chosenPrice) === chosenPrice
			);

			if (existingRoomIndex !== -1) {
				// Update count of the existing room
				const updatedRooms = [...prev];
				updatedRooms[existingRoomIndex] = {
					...updatedRooms[existingRoomIndex],
					count:
						updatedRooms[existingRoomIndex].count + parseInt(selectedCount, 10),
				};
				return updatedRooms;
			} else {
				// Add new room entry
				return [
					...prev,
					{
						room_type: selectedRoomType,
						chosenPrice: chosenPrice,
						count: parseInt(selectedCount, 10),
					},
				];
			}
		});

		// Reset selections for the next entry
		setSelectedRoomType("");
		setSelectedPriceOption("");
		setSelectedCount("");
	};

	const calculateTotalAmountPerDay = () => {
		return pickedRoomsType.reduce((total, room) => {
			return total + room.count * room.chosenPrice;
		}, 0);
	};

	const handleOk = () => {
		if (selectedRoomIndex !== null) {
			setPickedRoomsType((prev) => {
				const updatedRooms = [...prev];
				updatedRooms[selectedRoomIndex] = {
					...updatedRooms[selectedRoomIndex],
					count: updatedRoomCount,
					chosenPrice: updatedRoomPrice, // Update the price here
				};
				return updatedRooms;
			});
		}
		setIsModalVisible(false);
	};

	const handleCancel = () => {
		setIsModalVisible(false);
	};

	const removeRoom = () => {
		if (selectedRoomIndex !== null) {
			setPickedRoomsType((prev) =>
				prev.filter((_, index) => index !== selectedRoomIndex)
			);
		}
		setIsModalVisible(false);
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

	return (
		<>
			{loading ? (
				<div className='text-center my-5'>
					<Spin size='large' />
					<p>
						{" "}
						{chosenLanguage === "Arabic" ? "" : ""} Loading Reservations...
					</p>
				</div>
			) : (
				<ZReservationFormWrapper arabic={chosenLanguage === "Arabic"}>
					<Modal
						title='Update Picked Room'
						open={isModalVisible}
						onOk={handleOk}
						onCancel={handleCancel}
					>
						<p>
							{chosenLanguage === "Arabic" ? "" : ""}Update the count for the
							room:
						</p>
						<InputNumber
							min={1}
							value={updatedRoomCount}
							onChange={setUpdatedRoomCount}
						/>

						<p className='mt-4'>
							{chosenLanguage === "Arabic" ? "" : ""}Update the price for the
							room:
						</p>
						<InputNumber
							min={0}
							value={updatedRoomPrice}
							onChange={setUpdatedRoomPrice}
						/>
						<div className='my-3'>
							<button
								onClick={() => removeRoom(selectedRoomIndex)}
								className='btn btn-danger'
							>
								{chosenLanguage === "Arabic" ? "" : ""}Remove Room
							</button>
						</div>
					</Modal>

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

					<h6
						style={{
							textTransform: "uppercase",
							color: "darkcyan",
							fontWeight: "bold",
						}}
					>
						{chosenLanguage === "Arabic"
							? "تحذير... هذا حجز أولي"
							: "WARNING... THIS IS A preliminary RESERVATION"}
					</h6>

					<div className='row'>
						<div className='col-md-8'>
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
											style={{ marginTop: "10px", marginBottom: "10px" }}
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
												? " الدفع او السداد"
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
											<option value=''>Please Select</option>
											<option value='not paid'>Not Paid</option>
											<option value='credit/ debit'>Credit/ Debit</option>
											<option value='cash'>Cash</option>
											<option value='deposit'>Deposit</option>
										</select>
									</div>
									{paymentStatus === "deposit" && (
										<div className='mt-4'>
											<input
												value={paidAmount}
												onChange={(e) => setPaidAmount(e.target.value)}
												type='text'
												placeholder={
													chosenLanguage === "Arabic"
														? "المبلغ المودع"
														: "Deposited amount"
												}
											/>
										</div>
									)}
								</div>

								<div className='col-md-6 mx-auto my-2'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "عدد الضيوف"
												: "Total Guests"}
										</label>
										<input
											type='number'
											min={1} // Assuming at least 1 guest must be selected
											value={total_guests}
											onChange={(e) => setTotalGuests(e.target.value)}
											style={{
												height: "auto",
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										/>
									</div>
								</div>

								<div className='col-md-6 mx-auto my-2'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic"
												? "إرسال بريد إلكتروني"
												: "Send Email"}
										</label>
										<br />
										<input
											type='checkbox'
											checked={sendEmail}
											onChange={(e) => setSendEmail(e.target.checked)}
											style={{
												width: "20px",
												height: "20px",
											}}
										/>
									</div>
								</div>

								<div className='col-md-8 mx-auto my-2'>
									<div
										className='form-group'
										style={{ marginTop: "10px", marginBottom: "10px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											{chosenLanguage === "Arabic" ? "تعليق الضيف" : "Comment"}
										</label>
										<textarea
											background='red'
											cols={8}
											type='text'
											value={booking_comment}
											onChange={(e) => setBookingComment(e.target.value)}
											style={{
												width: "100%",
												padding: "10px",
												boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
												borderRadius: "10px",
											}}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className='col-md-4 taskeen'>
							<h4 className='my-4'>
								{chosenLanguage === "Arabic"
									? "حجز غرفة للضيف"
									: "Reserve A Room For The Guest"}
							</h4>

							<div className='row' style={{ textTransform: "capitalize" }}>
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
								<div className='col-md-6 my-2'>Not Paid</div>
								<div className='col-md-6 my-2'>
									{chosenLanguage === "Arabic" ? "حالة الحجز" : "Status"}
								</div>
								<div className='col-md-6 my-2'></div>
							</div>
							<h4 className='my-4 text-center' style={{ color: "#006ad1" }}>
								{chosenLanguage === "Arabic"
									? "المبلغ الإجمالي"
									: "Total Amount:"}{" "}
								{(
									calculateTotalAmountPerDay() *
									(Number(days_of_residence) - 1)
								).toLocaleString()}{" "}
								SAR
							</h4>
							<div className='text-center mx-auto'>
								<button
									className='btn btn-info'
									onClick={() => {
										window.scrollTo({ top: 1000, behavior: "smooth" });
									}}
								>
									{chosenLanguage === "Arabic"
										? "تسجيل دخول الزائر..."
										: "Check The Guest In..."}
								</button>
							</div>
						</div>
					</div>
					<div className='container'>
						<div className='row'>
							{roomsSummary && roomsSummary.length > 0 && (
								<div
									className='col-md-4'
									style={{ marginTop: "20px", marginBottom: "20px" }}
								>
									{chosenLanguage === "Arabic" ? (
										<>
											<label style={{ fontWeight: "bold" }}>نوع الغرفة</label>
											<select
												onChange={handleRoomTypeChange}
												value={selectedRoomType}
												style={{
													height: "auto",
													width: "100%",
													padding: "10px",
													boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
													borderRadius: "10px",
													textTransform: "capitalize",
												}}
											>
												<option value=''>اختر نوع الغرفة</option>
												{roomInventory &&
													roomInventory.map((room) => (
														<option key={room.room_type} value={room.room_type}>
															{room.room_type} | المتاح: {room.available} غرف
														</option>
													))}
											</select>
										</>
									) : (
										<>
											<label style={{ fontWeight: "bold" }}>Room Type</label>
											<select
												onChange={handleRoomTypeChange}
												value={selectedRoomType}
												style={{
													height: "auto",
													width: "100%",
													padding: "10px",
													boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
													borderRadius: "10px",
													textTransform: "capitalize",
												}}
											>
												<option value=''>Select Room Type</option>
												{roomsSummary.map((room) => (
													<option key={room.room_type} value={room.room_type}>
														{room.room_type} | Available: {room.available} Rooms
													</option>
												))}
											</select>
										</>
									)}
								</div>
							)}

							{selectedRoomType && (
								<div
									className='col-md-4'
									style={{ marginTop: "20px", marginBottom: "20px" }}
								>
									<label style={{ fontWeight: "bold" }}>Room Price</label>
									<select
										onChange={handlePriceOptionChange}
										value={selectedPriceOption}
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
									>
										<option value=''>Select Price Option</option>
										{roomsSummary &&
											roomsSummary
												.filter((room) => room.room_type === selectedRoomType)
												.map((room) => {
													const { room_price } = room;
													return Object.entries(room_price).map(
														([key, value]) => (
															<option key={key} value={value}>
																{`${key}: ${value} SAR`}
															</option>
														)
													);
												})}
										<option value='custom'>Custom Price</option>
									</select>
									{selectedPriceOption === "custom" && (
										<div
											className='form-group'
											style={{ marginTop: "20px", marginBottom: "20px" }}
										>
											<label style={{ fontWeight: "bold" }}>
												Enter Custom Price
											</label>
											<input
												type='text'
												value={updatedRoomPrice}
												onChange={(e) => setUpdatedRoomPrice(e.target.value)}
												style={{
													height: "auto",
													width: "100%",
													padding: "10px",
													boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
													borderRadius: "10px",
												}}
											/>
										</div>
									)}
								</div>
							)}

							{selectedRoomType && selectedPriceOption && (
								<div
									className={
										selectedPriceOption === "custom"
											? "col-md-3 mt-5 mx-auto"
											: "col-md-4"
									}
								>
									<div
										className='form-group'
										style={{ marginTop: "20px", marginBottom: "20px" }}
									>
										<label style={{ fontWeight: "bold" }}>
											How Many Rooms?
										</label>
										<input
											background='red'
											type='text'
											value={selectedCount}
											onChange={handleRoomCountChange}
										/>
									</div>
								</div>
							)}

							{selectedRoomType && selectedPriceOption && selectedCount && (
								<div className='col-md-4 mx-auto text-center'>
									<button
										onClick={addRoomToReservation}
										className='btn btn-primary'
									>
										Add Room
									</button>
								</div>
							)}
						</div>
					</div>

					<div className='container mt-3'>
						{customer_details.name &&
						start_date &&
						end_date &&
						pickedRoomsType.length > 0 ? (
							<>
								<div className='total-amount my-3'>
									<h5 style={{ fontWeight: "bold" }}>
										Days Of Residence: {days_of_residence} Days /{" "}
										{days_of_residence <= 1 ? 1 : days_of_residence - 1} Nights
									</h5>

									<h4>
										Total Amount Per Day: {calculateTotalAmountPerDay()} SAR/
										Day
									</h4>
									<div className='room-list my-3'>
										{pickedRoomsType.map((room, index) => (
											<div
												key={index}
												className='room-item my-2'
												style={{
													fontWeight: "bold",
													textTransform: "capitalize",
													cursor: "pointer",
													fontSize: "1.1rem",
													color: "darkgoldenrod",
												}}
												onClick={() => openModal(room, index)}
											>
												{`Room Type: ${room.room_type}, Price: ${room.chosenPrice} SAR, Count: ${room.count} Rooms (Click To Update)`}
											</div>
										))}
									</div>

									<h3>
										Total Amount:{" "}
										{(
											calculateTotalAmountPerDay() *
											Number(days_of_residence - 1)
										).toLocaleString()}{" "}
										SAR
									</h3>
									{paidAmount && paymentStatus === "deposit" && (
										<h3>Paid Amount: {paidAmount.toLocaleString()} SAR</h3>
									)}
								</div>
								<div className='mt-5 mx-auto text-center col-md-6'>
									<button
										className='btn btn-success w-50'
										onClick={() => {
											clickSubmit2();
										}}
										style={{ fontWeight: "bold", fontSize: "1.2rem" }}
									>
										Make A Reservation...
									</button>
								</div>
							</>
						) : null}
					</div>
				</ZReservationFormWrapper>
			)}
		</>
	);
};

export default ZReservationForm2;

const ZReservationFormWrapper = styled.div`
	h4 {
		font-size: 1.35rem;
		font-weight: bolder;
	}
	text-align: ${(props) => (props.arabic ? "right" : "")};

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
	input[type="number"],
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
	input[type="number"]:focus,
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
`;
