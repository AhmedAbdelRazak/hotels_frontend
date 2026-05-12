import styled from "styled-components";

const ZInputFieldRoomsPFloor = ({
	Title,
	value,
	handleFloorRoomsCount,
	keyValue, // Use concatenated key here
	numRoomTypes,
	chosenLanguage,
}) => {
	const isArabic = chosenLanguage === "Arabic";

	return (
		<InputFieldStyling
			className='form-group'
			$isArabic={isArabic}
			$isCompact={numRoomTypes > 8}
		>
			<label htmlFor={`floor-room-${keyValue}`}>{Title}</label>
			<input
				id={`floor-room-${keyValue}`}
				type='number'
				min='0'
				value={value}
				onChange={(e) => handleFloorRoomsCount(keyValue, e.target.value)}
				required
			/>
		</InputFieldStyling>
	);
};

export default ZInputFieldRoomsPFloor;

const InputFieldStyling = styled.div`
	display: grid;
	gap: 0.45rem;
	align-content: start;
	min-height: ${({ $isCompact }) => ($isCompact ? "92px" : "104px")};
	padding: 0.75rem;
	border: 1px solid #d7e7f8;
	border-radius: 14px;
	background: #ffffff;
	text-align: ${({ $isArabic }) => ($isArabic ? "right" : "left")};
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);

	label {
		margin: 0;
		min-height: 30px;
		color: #26384d;
		font-weight: 900;
		font-size: 0.78rem;
		text-transform: capitalize;
		line-height: 1.25;
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
		border: 1px solid #bdd7f4;
		border-radius: 10px;
		background: #f8fbff;
		font-weight: 900;
		text-align: center;
	}
	input[type="text"]:focus,
	input[type="email"]:focus,
	input[type="password"]:focus,
	input[type="number"]:focus,
	input[type="date"]:focus,
	select:focus,
	textarea:focus,
	label:focus {
		outline: none;
		border: 1px solid var(--primaryColor);
		box-shadow: 0 0 0 4px rgba(22, 119, 255, 0.12);
		transition: var(--mainTransition);
		font-weight: bold;
	}
`;
