import React, { useState } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import { updatePaymentToken } from "../apiAdmin";

const TokenUpdate = ({ reservation }) => {
	const { user, token } = isAuthenticated();
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const handleTokenUpdate = async () => {
		try {
			setLoading(true);
			setMessage("");
			// Call API function
			const newTokenId = prompt("Enter the new tokenized payment ID:");
			if (!newTokenId) {
				setLoading(false);
				return setMessage("Token ID update canceled.");
			}

			const response = await updatePaymentToken(
				user._id,
				token,
				reservation._id,
				newTokenId
			);
			setMessage(response.message || "Token updated successfully!");
		} catch (error) {
			setMessage("Failed to update token. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<TokenUpdateWrapper>
			<h3>Update Payment Token</h3>
			<p>
				This action will update the payment token for the selected reservation.
			</p>
			<Button onClick={handleTokenUpdate} disabled={loading}>
				{loading ? "Updating..." : "Update Token"}
			</Button>
			{message && <Message>{message}</Message>}
		</TokenUpdateWrapper>
	);
};

export default TokenUpdate;

const TokenUpdateWrapper = styled.div`
	text-align: center;
	padding: 20px;
	border: 1px solid #ccc;
	border-radius: 10px;
	background-color: #f9f9f9;
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
`;

const Button = styled.button`
	background-color: #007bff;
	color: white;
	padding: 10px 20px;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	margin-top: 10px;

	&:hover {
		background-color: #0056b3;
	}

	&:disabled {
		background-color: #ccc;
		cursor: not-allowed;
	}
`;

const Message = styled.p`
	margin-top: 10px;
	color: ${(props) => (props.error ? "red" : "green")};
	font-weight: bold;
`;
