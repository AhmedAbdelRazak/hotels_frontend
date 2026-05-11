import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { DatePicker } from "antd";
import { Modal, InputNumber } from "antd";
import moment from "moment";
import {
	getListOfRoomSummary,
	gettingRoomInventory,
	updateSingleReservation,
} from "../../HotelModule/apiAdmin";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";

export const EditReservationMain = ({
	chosenLanguage,
	reservation,
	setReservation,
	hotelDetails,
}) => {
	const [selectedRoomType, setSelectedRoomType] = useState("");
	const [selectedPriceOption, setSelectedPriceOption] = useState("");
	const [selectedCount, setSelectedCount] = useState("");

	const [isModalVisible, setIsModalVisible] = useState(false);
	const [sendEmail, setSendEmail] = useState(false);
	const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
	const [updatedRoomCount, setUpdatedRoomCount] = useState(0);
	const [updatedRoomPrice, setUpdatedRoomPrice] = useState(0);
	const [roomsSummary, setRoomsSummary] = useState("");
	const [roomInventory, setRoomInventory] = useState("");

	const { user } = isAuthenticated();
	const isArabic = chosenLanguage === "Arabic";
	const apiErrorMessage = (
		response,
		englishFallback = "An error occurred while updating the reservation",
		arabicFallback = "حدث خطأ أثناء تحديث الحجز"
	) =>
		isArabic
			? response?.errorArabic ||
			  response?.messageArabic ||
			  response?.error ||
			  response?.message ||
			  arabicFallback
			: response?.error ||
			  response?.message ||
			  response?.errorArabic ||
			  response?.messageArabic ||
			  englishFallback;
	const successMessage = (english, arabic) => (isArabic ? arabic : english);

	const formatDate = (date) => {
		if (!date) return "";

		const d = new Date(date);
		let month = "" + (d.getMonth() + 1);
		let day = "" + d.getDate();
		let year = d.getFullYear();

		if (month.length < 2) month = "0" + month;
		if (day.length < 2) day = "0" + day;

		return [year, month, day].join("-");
	};

	// eslint-disable-next-line
	const disabledDate = (current) => {
		// Can not select days before today and today
		return current < moment();
	};

	const getRoomInventory = () => {
		const formattedStartDate = formatDate(reservation.checkin_date);
		const formattedEndDate = formatDate(reservation.checkout_date);
		gettingRoomInventory(
			formattedStartDate,
			formattedEndDate,
			user._id,
			reservation.hotelId
		).then((data) => {
			if (data && data.error) {
				console.log(data.error, "Error rendering");
			} else {
				setRoomInventory(data);
			}
		});
	};

	const gettingOverallRoomsSummary = () => {
		if (reservation.checkin_date && reservation.checkout_date) {
			const formattedStartDate = formatDate(reservation.checkin_date);
			const formattedEndDate = formatDate(reservation.checkout_date);

			getListOfRoomSummary(
				formattedStartDate,
				formattedEndDate,
				reservation.hotelId
			).then((data) => {
				if (data && data.error) {
					console.log(data.error, "Error rendering");
				} else {
					setRoomsSummary(data);
				}
			});
		} else {
			setRoomsSummary("");
		}
	};
	console.log(reservation, "reservation");

	useEffect(() => {
		gettingOverallRoomsSummary();

		if (reservation.checkin_date && reservation.checkout_date) {
			getRoomInventory();
		}
		// eslint-disable-next-line
	}, [reservation.checkin_date, reservation.checkout_date]);

	const openModal = (room, index) => {
		setIsModalVisible(true);
		setSelectedRoomIndex(index);
		setUpdatedRoomCount(room.count);
		setUpdatedRoomPrice(room.chosenPrice); // Set the current price here
	};

	const onStartDateChange = (value) => {
		// Convert 'value' to a Date object at midnight to disregard time
		const dateAtMidnight = value ? value.clone().startOf("day").toDate() : null;

		setReservation((currentReservation) => {
			const end = currentReservation.checkout_date
				? moment(currentReservation.checkout_date).startOf("day").toDate()
				: null;

			// Calculate the difference in days only if there's both checkin and checkout dates
			const duration =
				dateAtMidnight && end
					? moment(end).diff(moment(dateAtMidnight), "days")
					: 0;

			return {
				...currentReservation,
				checkin_date: dateAtMidnight ? dateAtMidnight.toISOString() : null,
				// Update days_of_residence only if both dates are present and the duration is non-negative
				days_of_residence:
					end && dateAtMidnight && duration >= 0
						? duration
						: currentReservation.days_of_residence,
			};
		});
	};

	const onEndDateChange = (date) => {
		// Convert 'date' to a Date object at midnight to disregard time
		const adjustedDate = date ? date.clone().startOf("day").toDate() : null;

		setReservation((currentReservation) => {
			const start = currentReservation.checkin_date
				? moment(currentReservation.checkin_date).startOf("day").toDate()
				: null;

			// Calculate the difference in days
			const duration =
				start && adjustedDate
					? moment(adjustedDate).diff(moment(start), "days")
					: 0;

			return {
				...currentReservation,
				checkout_date: adjustedDate ? adjustedDate.toISOString() : null, // Store as ISO string or null if no date
				days_of_residence: duration >= 0 ? duration : 0,
			};
		});
	};

	const disabledEndDate = (current) => {
		// Disables all dates before the start date or today's date (whichever is later)
		return current && current < moment(reservation.checkin_date).startOf("day");
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

		setReservation((prevState) => {
			// Assuming pickedRoomsType is supposed to be an array
			let updatedRoomsType = prevState.pickedRoomsType || [];

			// Find existing room index
			const existingRoomIndex = updatedRoomsType.findIndex(
				(item) =>
					item.room_type === selectedRoomType &&
					parseFloat(item.chosenPrice) === chosenPrice
			);

			if (existingRoomIndex !== -1) {
				// Update count of the existing room
				updatedRoomsType = updatedRoomsType.map((item, index) =>
					index === existingRoomIndex
						? {
								...item,
								count: item.count + parseInt(selectedCount, 10),
						  }
						: item
				);
			} else {
				// Add new room entry
				updatedRoomsType.push({
					room_type: selectedRoomType,
					chosenPrice: chosenPrice,
					count: parseInt(selectedCount, 10),
				});
			}

			// Return the updated state
			return {
				...prevState,
				pickedRoomsType: updatedRoomsType,
			};
		});

		// Reset selections for the next entry
		setSelectedRoomType("");
		setSelectedPriceOption("");
		setSelectedCount("");
	};

	const calculateTotalAmountPerDay = () => {
		return reservation.pickedRoomsType.reduce((total, room) => {
			return total + room.count * room.chosenPrice;
		}, 0);
	};

	console.log(reservation.pickedRoomsType, "reservation.pickedRoomsType");

	const handleOk = () => {
		if (selectedRoomIndex !== null) {
			setReservation((currentReservation) => {
				const updatedRooms = [...currentReservation.pickedRoomsType];
				updatedRooms[selectedRoomIndex] = {
					...updatedRooms[selectedRoomIndex],
					count: updatedRoomCount,
					chosenPrice: updatedRoomPrice,
				};
				return {
					...currentReservation,
					pickedRoomsType: updatedRooms,
				};
			});
		}
		setIsModalVisible(false);
	};

	const handleCancel = () => {
		setIsModalVisible(false);
	};

	const removeRoom = () => {
		if (selectedRoomIndex !== null) {
			setReservation((currentReservation) => ({
				...currentReservation,
				pickedRoomsType: currentReservation.pickedRoomsType.filter(
					(_, index) => index !== selectedRoomIndex
				),
			}));
		}
		setIsModalVisible(false);
	};

	// This function calculates the total number of nights between check-in and check-out dates
	const calculateNightsOfResidence = () => {
		const checkinDate = moment(reservation.checkin_date);
		const checkoutDate = moment(reservation.checkout_date);
		return checkoutDate.diff(checkinDate, "days");
	};

	const UpdateReservation = () => {
		const confirmationMessage = successMessage(
			"Are you sure you want to update this reservation?",
			"هل أنت متأكد أنك تريد تحديث هذا الحجز؟"
		);
		if (window.confirm(confirmationMessage)) {
			const updateData = {
				...reservation,
				total_amount:
					calculateTotalAmountPerDay() * Number(calculateNightsOfResidence()),

				sub_total:
					calculateTotalAmountPerDay() * Number(calculateNightsOfResidence()),
				hotelName: hotelDetails.hotelName,
				sendEmail: sendEmail,
			};

			updateSingleReservation(reservation._id, updateData).then((response) => {
				if (response.error) {
					console.error(response.error);
					toast.error(
						apiErrorMessage(
							response,
							"An error occurred while updating the status",
							"حدث خطأ أثناء تحديث حالة الحجز"
						)
					);
				} else {
					toast.success(
						successMessage(
							"Reservation was successfully updated & Email was sent to the guest",
							"تم تحديث الحجز بنجاح وتم إرسال البريد الإلكتروني إلى النزيل"
						)
					);
					setIsModalVisible(false);

					// Update local state or re-fetch reservation data if necessary
					setReservation(response.reservation);
				}
			});
		}
	};

	console.log(reservation, "reservation");
	return (
		<div>
			<EditReservationMainWrapper isArabic={chosenLanguage === "Arabic"}>
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
										value={reservation.customer_details.name}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													name: e.target.value,
												},
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
										{chosenLanguage === "Arabic" ? "الهاتف" : "Guest Phone"}
									</label>
									<input
										type='text'
										value={reservation.customer_details.phone || ""}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													phone: e.target.value,
												},
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
										value={reservation.customer_details.email}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													email: e.target.value,
												},
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
										{chosenLanguage === "Arabic"
											? "رقم جواز السفر"
											: "Guest Passport #"}
									</label>
									<input
										background='red'
										type='text'
										value={reservation.customer_details.passport}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													passport: e.target.value,
												},
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
											? "تاريخ انتهاء جواز السفر"
											: "Passport Expiry Date"}
									</label>
									<input
										background='red'
										type='text'
										value={reservation.customer_details.passportExpiry}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													passportExpiry: e.target.value,
												},
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
										{chosenLanguage === "Arabic" ? "الجنسية" : "Nationality"}
									</label>
									<input
										background='red'
										type='text'
										value={reservation.customer_details.nationality}
										onChange={(e) =>
											setReservation({
												...reservation,
												customer_details: {
													...reservation.customer_details,
													nationality: e.target.value,
												},
											})
										}
									/>
								</div>
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
									{reservation.checkout_date
										? `(${new Date(reservation.checkout_date).toDateString()})`
										: ""}
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
									{reservation.checkin_date
										? `(${new Date(reservation.checkin_date).toDateString()})`
										: ""}
								</label>
								<br />
								<DatePicker
									className='inputFields'
									// disabledDate={disabledDate}
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
										onChange={(e) =>
											setReservation({
												...reservation,
												booking_source: e.target.value,
											})
										}
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
										}}
									>
										<option value=''>
											{reservation.booking_source
												? reservation.booking_source
												: "Please Select"}
										</option>
										<option value='janat'>Janat</option>
										<option value='manual'>Manual Reservation</option>
										<option value='booking.com'>Booking.com</option>
										<option value='trivago'>Trivago</option>
										<option value='expedia'>Expedia</option>
										<option value='hotel.com'>Hotel.com</option>
									</select>
								</div>
							</div>

							{reservation.booking_source !== "manual" &&
								reservation.booking_source && (
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
												value={reservation.confirmation_number}
												onChange={(e) =>
													setReservation({
														...reservation,
														confirmation_number: e.target.value,
													})
												}
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
										onChange={(e) =>
											setReservation({
												...reservation,
												payment: e.target.value,
											})
										}
										style={{
											height: "auto",
											width: "100%",
											padding: "10px",
											boxShadow: "2px 2px 2px 2px rgb(0,0,0,0.2)",
											borderRadius: "10px",
											textTransform: "capitalize",
										}}
									>
										{reservation && reservation.payment ? (
											<option value=''>{reservation.payment}</option>
										) : (
											<option value=''>Please Select</option>
										)}
										<option value='not paid'>Not Paid</option>
										<option value='credit/ debit'>Credit/ Debit</option>
										<option value='cash'>Cash</option>
										<option value='deposit'>Deposit</option>
									</select>
								</div>
								{reservation.payment === "deposit" && (
									<div className='mt-4'>
										<input
											value={reservation.paid_amount}
											onChange={(e) =>
												setReservation({
													...reservation,
													paid_amount: e.target.value,
												})
											}
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
										type='text'
										min={1} // Assuming at least 1 guest must be selected
										value={reservation.total_guests}
										onChange={(e) =>
											setReservation({
												...reservation,
												total_guests: e.target.value,
											})
										}
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
										value={reservation.booking_comment}
										onChange={(e) =>
											setReservation({
												...reservation,
												booking_comment: e.target.value,
											})
										}
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
								{chosenLanguage === "Arabic" ? "رقم التأكيد" : "Confirmation #"}
							</div>

							<div className='col-md-6 my-2'>
								{reservation.confirmation_number}
							</div>

							<div className='col-md-6 my-2'>
								{chosenLanguage === "Arabic" ? "تاريخ الوصول" : "Arrival"}
								<div style={{ background: "#bfbfbf", padding: "2px" }}>
									{reservation.checkin_date
										? `${new Date(reservation.checkin_date).toDateString()}`
										: ""}
								</div>
							</div>

							<div className='col-md-6 my-2'>
								{chosenLanguage === "Arabic" ? "تاريخ المغادرة" : "Departure"}
								<div style={{ background: "#bfbfbf", padding: "2px" }}>
									{reservation.checkout_date
										? `${new Date(reservation.checkout_date).toDateString()}`
										: ""}
								</div>
							</div>
							<div className='col-md-6 my-2'>
								{chosenLanguage === "Arabic" ? "طريقة الدفع" : "Payment"}
							</div>
							<div className='col-md-6 my-2'>{reservation.payment}</div>
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
								Number(calculateNightsOfResidence())
							).toLocaleString()}{" "}
							SAR
						</h4>

						{reservation.paid_amount > 0 &&
							reservation.payment === "deposit" && (
								<h4 className='my-4 text-center' style={{ color: "darkgreen" }}>
									Paid Amount:{" "}
									{Number(reservation.paid_amount).toLocaleString()} SAR
								</h4>
							)}
					</div>
				</div>
				<div
					className='container'
					dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
				>
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
									<label style={{ fontWeight: "bold" }}>How Many Rooms?</label>
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
					{reservation.customer_details.name &&
					reservation.checkin_date &&
					reservation.checkout_date &&
					reservation.pickedRoomsType.length > 0 ? (
						<>
							<div className='total-amount my-3'>
								<h5 style={{ fontWeight: "bold" }}>
									Days Of Residence: {reservation.days_of_residence + 1} Days /{" "}
									{reservation.days_of_residence <= 1
										? 1
										: reservation.days_of_residence}{" "}
									Nights
								</h5>

								<h4>
									Total Amount Per Day:{" "}
									{calculateTotalAmountPerDay() &&
										calculateTotalAmountPerDay().toLocaleString()}{" "}
									SAR/ Day
								</h4>
								<div className='room-list my-3'>
									{reservation.pickedRoomsType.map((room, index) => (
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
											{`Room Type: ${
												room.room_type
											}, Price: ${room.chosenPrice.toLocaleString()} SAR, Count: ${
												room.count
											} Rooms (Click To Update)`}
										</div>
									))}
								</div>

								<h3>
									Total Amount:{" "}
									{(
										calculateTotalAmountPerDay() *
										Number(calculateNightsOfResidence())
									).toLocaleString()}{" "}
									SAR
								</h3>
							</div>
							<div className='mt-5 mx-auto text-center col-md-6'>
								<button
									className='btn btn-success w-50'
									onClick={() => {
										UpdateReservation();
									}}
									style={{ fontWeight: "bold", fontSize: "1.2rem" }}
								>
									Update Reservation
								</button>
							</div>
						</>
					) : null}
				</div>
			</EditReservationMainWrapper>
		</div>
	);
};

const EditReservationMainWrapper = styled.div`
	h4 {
		font-size: 1.35rem;
		font-weight: bolder;
	}
	text-align: ${(props) => (props.isArabic ? "right" : "")};

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
		text-align: ${(props) => (props.isArabic ? "right" : "")};
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
