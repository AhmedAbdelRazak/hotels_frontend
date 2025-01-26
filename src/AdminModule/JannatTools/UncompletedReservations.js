// src/components/checkout/UncompletedReservations.js

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getUncompletedReservations } from "../apiAdmin";
import dayjs from "dayjs";
import { isAuthenticated } from "../../auth";

const UncompletedReservations = () => {
	const [reservations, setReservations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	// Correctly invoke isAuthenticated as a function
	const { user, token } = isAuthenticated();

	useEffect(() => {
		// Ensure user and token are available before fetching
		if (!user || !token) {
			setError("User is not authenticated.");
			setLoading(false);
			return;
		}

		const fetchReservations = async () => {
			try {
				setLoading(true);
				const data = await getUncompletedReservations(user._id, token);
				if (data && data.data) {
					setReservations(data.data);
					console.log(data, "data");
				} else {
					setError("No reservations found.");
				}
			} catch (err) {
				setError("Failed to fetch reservations.");
				console.error("Error fetching reservations:", err);
			} finally {
				setLoading(false);
			}
		};

		fetchReservations();
		// eslint-disable-next-line
	}, [user?._id, token]); // Depend on specific, stable properties

	// Define table headers
	const headers = [
		"#",
		"Hotel Name",
		"Customer Name",
		"Email",
		"Phone",
		"Created At",
		"Check-in Date",
		"Check-out Date",
		"Room Name",
		"Total Amount",
	];

	return (
		<UncompletedReservationsWrapper>
			<h2>Uncompleted Reservations</h2>

			{loading && (
				<LoaderWrapper>
					<Spinner />
					<span>Loading reservations...</span>
				</LoaderWrapper>
			)}

			{error && <ErrorMessage>{error}</ErrorMessage>}

			{!loading && !error && reservations.length === 0 && (
				<NoDataMessage>No uncompleted reservations found.</NoDataMessage>
			)}

			{!loading && !error && reservations.length > 0 && (
				<TableContainer>
					<StyledTable>
						<thead>
							<tr>
								{headers.map((header) => (
									<th key={header}>{header}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{reservations.map((reservation, i) => (
								<tr key={i}>
									<td>{i + 1}</td>
									<td>{reservation.hotelId.hotelName}</td>
									<td>{reservation.customer_details.name}</td>
									<td>{reservation.customer_details.email}</td>
									<td>{reservation.customer_details.phone}</td>
									<td>
										{dayjs(reservation.createdAt).format("DD MMM YYYY, HH:mm")}
									</td>
									<td>
										{dayjs(reservation.checkin_date).format("DD MMM YYYY")}
									</td>
									<td>
										{dayjs(reservation.checkout_date).format("DD MMM YYYY")}
									</td>
									<td>
										{reservation.pickedRoomsType &&
										reservation.pickedRoomsType.length > 0
											? reservation.pickedRoomsType[0].displayName
											: "N/A"}
									</td>
									<td>{parseFloat(reservation.total_amount).toFixed(2)} SAR</td>
								</tr>
							))}
						</tbody>
					</StyledTable>
				</TableContainer>
			)}
		</UncompletedReservationsWrapper>
	);
};

export default UncompletedReservations;

// Styled Components

const UncompletedReservationsWrapper = styled.div`
	padding: 20px;
	background-color: #f9f9f9;
	border-radius: 10px;

	h2 {
		text-align: center;
		margin-bottom: 20px;
		color: #333;
	}
`;

const LoaderWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 50px 0;

	span {
		margin-left: 10px;
		font-size: 1.1rem;
		color: #555;
	}
`;

const Spinner = styled.div`
	border: 4px solid rgba(0, 0, 0, 0.1);
	width: 36px;
	height: 36px;
	border-radius: 50%;
	border-left-color: #09f;
	animation: spin 1s linear infinite;

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
`;

const ErrorMessage = styled.div`
	background-color: #ffe6e6;
	color: #cc0000;
	padding: 15px;
	border-radius: 5px;
	margin: 20px 0;
	text-align: center;
`;

const NoDataMessage = styled.div`
	text-align: center;
	color: #777;
	margin: 20px 0;
	font-size: 1.1rem;
`;

const TableContainer = styled.div`
	overflow-x: auto;
`;

const StyledTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	min-width: 800px;

	thead {
		background-color: #006ad1;
		color: white;
		font-size: 0.8rem;
	}

	th,
	td {
		padding: 12px 15px;
		text-align: left;
		border: 1px solid #ddd;
		font-size: 0.8rem;
		text-transform: capitalize;
	}

	tbody tr:nth-child(even) {
		background-color: #f2f2f2;
	}

	tbody tr:hover {
		background-color: #e9f5ff;
	}

	th {
		position: sticky;
		top: 0;
		z-index: 1;
	}

	/* Responsive Styles */
	@media (max-width: 1024px) {
		th,
		td {
			padding: 10px 12px;
		}
	}

	@media (max-width: 768px) {
		min-width: 600px;

		th,
		td {
			padding: 8px 10px;
			font-size: 0.8rem;
		}
	}

	@media (max-width: 480px) {
		min-width: 500px;

		th,
		td {
			padding: 6px 8px;
			font-size: 0.75rem;
		}
	}
`;
