/** @format */

import React, { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { authenticate, isAuthenticated, signin } from "../auth";
// import Google from "../auth/Google";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

const Signin = ({ history }) => {
	const [values, setValues] = useState({
		email: "",
		password: "",
		loading: false,
		redirectToReferrer: false,
	});

	const { email, password, loading, redirectToReferrer } = values;
	const { user } = isAuthenticated();

	const handleChange = (name) => (event) => {
		setValues({ ...values, error: false, [name]: event.target.value });
	};

	// const informParent = (response) => {
	// 	setValues({ ...values, error: false, loading: true });
	// 	if (response.error) {
	// 		setValues({ ...values, error: response.error, loading: false });
	// 		toast.error(response.error);
	// 	} else {
	// 		authenticate2(response, () => {
	// 			setValues({
	// 				...values,
	// 				redirectToReferrer: true,
	// 			});
	// 		});
	// 	}
	// };

	const clickSubmit = (event) => {
		event.preventDefault();
		setValues({ ...values, error: false, loading: true });
		signin({ email, password }).then((data) => {
			if (data.error) {
				setValues({ ...values, error: data.error, loading: false });
				toast.error(data.error);
			} else if (data.user.activeUser === false) {
				setValues({ ...values, error: data.error, loading: false });
				return toast.error(
					"User was deactivated, Please reach out to the admin site"
				);
			} else {
				// console.log(data);
				authenticate(data, () => {
					setValues({
						...values,
						redirectToReferrer: true,
					});
				});
			}
		});
	};

	const showLoading = () =>
		loading && (
			<div className='alert alert-info'>
				<h2>Loading...</h2>
			</div>
		);

	const redirectUser = () => {
		if (redirectToReferrer) {
			if (user && user.role === 1000) {
				return (window.location.href = "/admin/dashboard");
			} else if (user && user.role === 2000) {
				return (window.location.href = "/hotel-management/dashboard");
			} else if (user && user.role === 3000) {
				return (window.location.href = "/staff/hotel/dashboard");
			} else {
				return (window.location.href = "/");
			}
		}

		if (
			isAuthenticated() &&
			isAuthenticated().user &&
			isAuthenticated().user.role === 2000
		) {
			return (window.location.href = "/hotel-management/new-reservation");
		}

		if (
			isAuthenticated() &&
			isAuthenticated().user &&
			isAuthenticated().user.role === 1000
		) {
			return (window.location.href = "/admin/dashboard");
		}

		if (
			isAuthenticated() &&
			isAuthenticated().user &&
			isAuthenticated().user.role === 3000
		) {
			return (window.location.href = "/staff/dashboard");
		}
	};

	const signinForm = () => (
		<FormSignin>
			<div className='row justify-content-md-center mt-4'>
				<div className='col-md-5 col-sm-12 '>
					<div className='form-container text-center'>
						<Fragment>
							<h1 className='mb-3'>
								Account <span className='text-primary'>Login</span>
							</h1>
							{/* <Google informParent={informParent} /> */}
						</Fragment>

						<form onSubmit={clickSubmit}>
							<div className='form-group' style={{ marginTop: "25px" }}>
								<Fragment>
									<label htmlFor='email' style={{ fontWeight: "bold" }}>
										Email Address / Phone
									</label>
								</Fragment>
								<input
									type='text'
									name='email'
									value={email}
									onChange={handleChange("email")}
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
								/>
							</div>
							<Fragment>
								<input
									type='submit'
									value='login'
									className='btn btn-primary w-75 btn-block mx-auto'
									//onClick={sendEmail}
								/>
							</Fragment>
						</form>
						<hr />
						<Fragment>
							<p
								style={{
									fontSize: "0.9rem",
									textAlign: "center",
								}}
							>
								Don't have an account, Please{" "}
								<strong
									style={{
										textDecoration: "underline",
										fontStyle: "italic",
										fontSize: "1rem",
									}}
								>
									<Link to='#' className='btn btn-sm btn-outline-primary'>
										Register Here
									</Link>
								</strong>
							</p>
							<hr />
							<p
								style={{
									fontSize: "0.9rem",
									textAlign: "center",
								}}
							>
								Forgot Your Password, Please{" "}
								<strong
									style={{
										textDecoration: "underline",
										fontStyle: "italic",
										fontSize: "1rem",
									}}
								>
									<Link to='#' className='btn btn-sm btn-outline-danger'>
										Reset Your Password
									</Link>
								</strong>
							</p>
						</Fragment>
					</div>
				</div>
			</div>
		</FormSignin>
	);

	return (
		<WholeSignin>
			<ToastContainer />
			{showLoading()}
			{signinForm()}
			{redirectUser()}
		</WholeSignin>
	);
};

export default Signin;

const FormSignin = styled.div`
	min-height: 628px;

	margin-top: 5%;
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

const WholeSignin = styled.div`
	margin-bottom: 150px;
	overflow: hidden;
`;
