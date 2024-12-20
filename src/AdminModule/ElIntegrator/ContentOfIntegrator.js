import React, { useState } from "react";
import styled from "styled-components";
import { Button, Modal, Input, Tabs, message, Upload } from "antd";
import {
	EyeInvisibleOutlined,
	EyeTwoTone,
	UploadOutlined,
} from "@ant-design/icons";
import { agodaData } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const ContentOfIntegrator = ({ allHotelDetailsAdmin }) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedHotel, setSelectedHotel] = useState(null);
	const [password, setPassword] = useState("");
	const [isPasswordVerified, setIsPasswordVerified] = useState(false);
	const [activeTab, setActiveTab] = useState("Agoda");
	const [file, setFile] = useState(null);
	const [integrateClicked, setIntegrateClicked] = useState(false);
	const { user, token } = isAuthenticated();

	const openModal = (hotel) => {
		setSelectedHotel(hotel);
		const IntegratorVerified = localStorage.getItem("IntegratorVerified");

		if (IntegratorVerified) {
			setIsPasswordVerified(true); // Skip password step
		} else {
			setIsPasswordVerified(false); // Require password verification
		}

		setIsModalVisible(true);
		setPassword(""); // Clear password field
	};

	const handlePasswordVerification = () => {
		if (password === process.env.REACT_APP_INTEGRATOR_PASSWORD) {
			setIsPasswordVerified(true);
			message.success(`Password verified successfully`);
			localStorage.setItem("IntegratorVerified", "true"); // Add a value for the key
		} else {
			message.error("Incorrect password. Please try again.");
		}
	};

	const handleFileChange = (file) => {
		setFile(file); // Store the file in state
	};

	const handleIntegrateReservations = async () => {
		if (!file) {
			message.error("Please upload a file before integrating.");
			return;
		}

		try {
			// Call the agodaData function
			const response = await agodaData(
				selectedHotel._id, // hotelId (accountId)
				selectedHotel.belongsTo._id, // belongsTo
				file,
				user._id, // userId
				token
			);

			if (response && response.message) {
				message.success(
					`Reservations integrated successfully for ${activeTab} in hotel ${selectedHotel.hotelName.toUpperCase()}!`
				);
				setIntegrateClicked(true);
			} else {
				message.error("Something went wrong while integrating reservations.");
			}
		} catch (error) {
			message.error("Error integrating reservations. Please try again.");
			console.error(error);
		}
	};

	const modalContent = isPasswordVerified ? (
		<Tabs defaultActiveKey='Agoda' onChange={(key) => setActiveTab(key)}>
			<Tabs.TabPane tab='Agoda' key='Agoda'>
				<p>
					Please ensure that the room types naming in the sheet matches the room
					types naming added in xhotelpro for hotel{" "}
					<span style={{ textTransform: "capitalize" }}>
						{selectedHotel?.hotelName}
					</span>
					.
				</p>
				<Upload
					beforeUpload={(file) => {
						handleFileChange(file);
						return false; // Prevent auto-upload
					}}
					accept='.xls,.xlsx,.csv'
					showUploadList={false}
				>
					<Button icon={<UploadOutlined />}>Upload Excel File</Button>
				</Upload>
				{file && <p>File selected: {file.name}</p>}
				<CenteredButton type='primary' onClick={handleIntegrateReservations}>
					Integrate Reservations ({activeTab})
				</CenteredButton>
				{integrateClicked && (
					<div
						style={{
							fontWeight: "bold",
							textDecoration: "underline",
							color: "darkgray",
							cursor: "pointer",
						}}
						onClick={() => {
							localStorage.setItem(
								"selectedHotel",
								JSON.stringify(selectedHotel)
							);

							window.open(
								`/hotel-management/new-reservation/${selectedHotel.belongsTo._id}/${selectedHotel._id}?list`,
								"_blank"
							);
						}}
					>
						CLICK HERE to Check Hotel Reservations List After Integrating...
					</div>
				)}
			</Tabs.TabPane>

			<Tabs.TabPane tab='Booking.com' key='Booking.com'>
				<p>
					Please ensure that the room types naming in the sheet matches the room
					types naming added in xhotelpro for hotel{" "}
					<span style={{ textTransform: "capitalize" }}>
						{selectedHotel?.hotelName}
					</span>
					.
				</p>

				<CenteredButton type='primary'>
					Integrate Reservations ({activeTab})
				</CenteredButton>
			</Tabs.TabPane>

			<Tabs.TabPane tab='Expedia' key='Expedia'>
				<p>
					Please ensure that the room types naming in the sheet matches the room
					types naming added in xhotelpro for hotel{" "}
					<span style={{ textTransform: "capitalize" }}>
						{selectedHotel?.hotelName}
					</span>
					.
				</p>

				<CenteredButton type='primary'>
					Integrate Reservations ({activeTab})
				</CenteredButton>
			</Tabs.TabPane>

			{/* Other tabs remain unchanged */}
		</Tabs>
	) : (
		<div>
			<Input.Password
				placeholder='Enter password'
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				iconRender={(visible) =>
					visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
				}
			/>
			<CenteredButton
				type='primary'
				style={{ marginTop: "10px" }}
				onClick={handlePasswordVerification}
			>
				Verify Password
			</CenteredButton>
		</div>
	);

	return (
		<ContentWrapper>
			<h2>Hotel List</h2>
			<HotelButtons>
				{allHotelDetailsAdmin.map((hotel) => (
					<StyledButton key={hotel._id} onClick={() => openModal(hotel)}>
						{hotel.hotelName}
					</StyledButton>
				))}
			</HotelButtons>
			<Modal
				title={
					<div style={{ textTransform: "capitalize" }}>
						Hotel: {selectedHotel?.hotelName}
					</div>
				}
				open={isModalVisible}
				onCancel={() => {
					setIntegrateClicked(false);
					setIsModalVisible(false);
					setFile(null); // Clear file selection when modal closes
				}}
				footer={null}
			>
				{modalContent}
			</Modal>
		</ContentWrapper>
	);
};

export default ContentOfIntegrator;

const ContentWrapper = styled.div`
	padding: 20px;

	h2 {
		text-align: center;
		margin-bottom: 20px;
	}
`;

const HotelButtons = styled.div`
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 20px;
`;

const StyledButton = styled(Button)`
	background-color: #004085; /* Dark blue */
	color: white;
	font-weight: bold;
	text-transform: capitalize;
	border: none;
	border-radius: 8px;
	height: 50px;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 16px;

	&:hover {
		background-color: #002752;
	}
`;

const CenteredButton = styled(Button)`
	display: block;
	margin: 20px auto;
	background-color: #ff6700; /* Dark orange */
	color: white;
	font-weight: bold;
	text-transform: capitalize;
	border: none;

	&:hover {
		background-color: #cc5200;
	}
`;