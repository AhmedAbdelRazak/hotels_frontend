/** @format */

import React, { Fragment, useState, useCallback, useEffect } from "react";
import styled from "styled-components";
import { isAuthenticated, signup } from "../../auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { gettingHotelDetailsForAdminAll } from "../apiAdmin";
import { Form, Select, message } from "antd";
const { Option } = Select;

const EmployeeRegister = () => {
	const [values, setValues] = useState({
		name: "",
		email: "",
		password: "",
		password2: "",
		error: "",
		success: false,
		misMatch: false,
		redirectToReferrer: "",
		loading: false,
	});
	const [allHotels, setAllHotels] = useState([]);
	const [selectedHotels, setSelectedHotels] = useState([]);
	const [accessTo, setAccessTo] = useState([]);

	const { user, token } = isAuthenticated();

	const {
		name,
		email,
		password,
		password2,
		phone,
		// eslint-disable-next-line
		success,
		misMatch,
		// eslint-disable-next-line
		loading,
	} = values;

	// console.log(success);

	const handleChange = (name) => (event) => {
		setValues({
			...values,
			error: false,
			misMatch: false,
			[name]: event.target.value,
		});
	};

	const getAllHotels = useCallback(async () => {
		try {
			const data = await gettingHotelDetailsForAdminAll(user._id, token);

			if (data && !data.error) {
				const sortedHotels =
					data &&
					data.hotels.sort((a, b) => a.hotelName.localeCompare(b.hotelName));
				setAllHotels(sortedHotels);
			} else {
				message.error("Failed to fetch hotels.");
			}
		} catch (error) {
			console.error("Error fetching hotels:", error);
		}
	}, [user._id, token]);

	useEffect(() => {
		getAllHotels();
		// eslint-disable-next-line
	}, [getAllHotels]);

	const clickSubmit = (event) => {
		event.preventDefault();
		if (password !== password2) {
			setValues({
				...values,
				success: false,
				misMatch: true,
			});
			return <>{toast.error(MisMatchError)}</>;
		} else {
			setValues({ ...values, error: false, misMatch: false });
			signup({
				name,
				email,
				password,
				password2,
				misMatch,
				role: 1000,
				phone: phone,
				hotelsToSupport: selectedHotels,
				accessTo: accessTo,
			}).then((data) => {
				if (data.error || data.misMatch) {
					setValues({ ...values, error: data.error, success: false });
					toast.error(data.error);
				} else {
					toast.success("Employee Successfully Registered");
					console.log("Successfully Added");

					setTimeout(() => {
						window.location.reload(false);
					}, 2000);
				}
			});
		}
	};

	const signUpForm = () => (
		<FormSignup>
			<div className='row justify-content-md-center mt-5'>
				<div className='col-md-5 col-sm-12 '>
					<div className='form-container text-center'>
						<Fragment>
							<h1 className='mb-3'>
								Employee <span className='text-primary'>Register</span>
							</h1>
							{/* <Google informParent={informParent} /> */}
						</Fragment>
						<form onSubmit={clickSubmit}>
							<div className='form-group'>
								<Fragment>
									<label htmlFor='name' style={{ fontWeight: "bold" }}>
										Full Name
									</label>
								</Fragment>
								<input
									type='text'
									name='name'
									value={name}
									onChange={handleChange("name")}
									required
								/>
							</div>

							<div className='form-group' style={{ marginTop: "25px" }}>
								<Fragment>
									<label htmlFor='email' style={{ fontWeight: "bold" }}>
										Email Address
									</label>
								</Fragment>
								<input
									type='text'
									name='email'
									value={email}
									onChange={handleChange("email")}
									required
								/>
							</div>

							<div className='form-group' style={{ marginTop: "25px" }}>
								<Fragment>
									<label htmlFor='phone' style={{ fontWeight: "bold" }}>
										Phone Number
									</label>
								</Fragment>
								<input
									type='text'
									name='phone'
									value={phone}
									onChange={handleChange("phone")}
									required
								/>
							</div>

							<div className='form-group ' style={{ marginTop: "25px" }}>
								<Fragment>
									<label htmlFor='password' style={{ fontWeight: "bold" }}>
										Password
									</label>
								</Fragment>
								<input
									type='password'
									name='password'
									value={password}
									onChange={handleChange("password")}
									required
								/>
							</div>
							<div
								className='form-group'
								style={{ marginTop: "25px", marginBottom: "40px" }}
							>
								<Fragment>
									<label htmlFor='password2' style={{ fontWeight: "bold" }}>
										{" "}
										Confirm Password
									</label>
								</Fragment>
								<input
									background='red'
									type='password'
									name='password2'
									value={password2}
									onChange={handleChange("password2")}
									required
								/>
							</div>
							<Form.Item>
								<Fragment>
									<label htmlFor='' style={{ fontWeight: "bold" }}>
										Select Hotels
									</label>
								</Fragment>
								<Select
									mode='multiple' // Allow multiple selections
									placeholder='Select hotels'
									value={selectedHotels} // Bind the selected values to the state
									onChange={(hotelIds) => setSelectedHotels(hotelIds)} // Update the state with selected IDs
								>
									{allHotels &&
										allHotels.map((hotel) => (
											<Option key={hotel._id} value={hotel._id}>
												{hotel.hotelName}
											</Option>
										))}
								</Select>
							</Form.Item>

							<Form.Item>
								<Fragment>
									<label htmlFor='' style={{ fontWeight: "bold" }}>
										Select Access To
									</label>
								</Fragment>
								<Select
									mode='multiple'
									placeholder='Access to what?'
									value={accessTo}
									onChange={(value) => setAccessTo(value)}
								>
									<Option value='all'>All Features</Option>
									<Option value='JannatTools'>Jannat Tools</Option>
									<Option value='CustomerService'>Customer Service</Option>
									<Option value='HotelsReservations'>
										Hotels' Reservations
									</Option>
									<Option value='Integrator'>Integrator</Option>
									<Option value='JannatBookingWebsite'>
										Jannat Booking Website
									</Option>

									<Option value='AdminDashboard'>Admin Dashboard</Option>
								</Select>
							</Form.Item>

							<Fragment>
								<input
									type='submit'
									value='Register'
									className='btn btn-primary w-75 btn-block mx-auto'
									//onClick={sendEmail}
								/>
							</Fragment>
						</form>
						<hr />
					</div>
				</div>
			</div>
		</FormSignup>
	);

	const MisMatchError = "Passwords Don't Match, Please Try Again!!";

	return (
		<WholeSignup>
			<ToastContainer />
			{signUpForm()}
		</WholeSignup>
	);
};

export default EmployeeRegister;

const FormSignup = styled.div`
	min-height: 677px;

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

	.form-container {
		margin-left: 50px;
		margin-right: 50px;
	}
`;

const WholeSignup = styled.div`
	margin-bottom: 100px;
	overflow: hidden;
`;
