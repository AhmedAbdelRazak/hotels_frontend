import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Spin } from "antd";
import styled, { createGlobalStyle } from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { getHotelById, singlePreReservationById } from "../../apiAdmin";
import ReservationDetail from "../../ReservationsFolder/ReservationDetail";
import { getOverallText, normalizeId } from "../overallShared";

const RESERVATION_DETAILS_MODAL_Z_INDEX = 12000;

const getReservationKey = (reservation = {}) =>
	normalizeId(reservation._id || reservation.id || reservation.confirmation_number);

const findReservationByKey = (reservations = [], key = "") =>
	(Array.isArray(reservations) ? reservations : []).find(
		(reservation) =>
			getReservationKey(reservation) === String(key || "") ||
			String(reservation?.confirmation_number || "") === String(key || "")
	);

const hasHotelRoomDetails = (hotel = {}) =>
	hotel &&
	typeof hotel === "object" &&
	Array.isArray(hotel.roomCountDetails);

const normalizeOwnerId = (reservation = {}, fallbackOwnerId = "") =>
	normalizeId(
		reservation.hotelOwnerId ||
			reservation.ownerId ||
			reservation.belongsTo ||
			reservation.hotelId?.belongsTo ||
			fallbackOwnerId
	);

const normalizeHotelDetails = (hotel = {}, ownerId = "") => {
	if (!hotel || hotel.error) return null;
	const nextOwnerId = normalizeId(hotel.belongsTo || ownerId);
	return {
		...hotel,
		_id: normalizeId(hotel._id),
		belongsTo:
			hotel.belongsTo && typeof hotel.belongsTo === "object"
				? hotel.belongsTo
				: { _id: nextOwnerId },
	};
};

const normalizeReservationForDetail = (
	reservation = {},
	fallbackReservation = {},
	fallbackOwnerId = ""
) => {
	const hotelId = normalizeId(reservation.hotelId || fallbackReservation.hotelId);
	const ownerId = normalizeOwnerId(
		{
			...fallbackReservation,
			...reservation,
			hotelOwnerId:
				reservation.hotelOwnerId ||
				fallbackReservation.hotelOwnerId ||
				reservation.hotelId?.belongsTo ||
				fallbackReservation.hotelId?.belongsTo,
		},
		fallbackOwnerId
	);
	return {
		...fallbackReservation,
		...reservation,
		hotelId,
		belongsTo: ownerId,
		hotelOwnerId: ownerId,
		roomDetails:
			Array.isArray(reservation.roomDetails) && reservation.roomDetails.length
				? reservation.roomDetails
				: fallbackReservation.roomDetails || [],
	};
};

const OverallReservationDetailsModal = ({
	reservations = [],
	selectedReservation,
	setSelectedReservation,
	ownerId,
	onReservationUpdated,
	chosenLanguage,
}) => {
	const isRTL = chosenLanguage === "Arabic";
	const labels = getOverallText(chosenLanguage);
	const history = useHistory();
	const location = useLocation();
	const [modalKey, setModalKey] = useState(0);
	const [loading, setLoading] = useState(false);
	const [modalReservation, setModalReservation] = useState(null);
	const [hotelDetails, setHotelDetails] = useState(null);

	const selectedKey = getReservationKey(selectedReservation || {});

	useEffect(() => {
		const params = new URLSearchParams(location.search || "");
		const reservationId = params.get("reservationId");
		if (!reservationId || selectedReservation) return;
		const matched = findReservationByKey(reservations, reservationId);
		if (matched) {
			setSelectedReservation(matched);
		} else {
			setSelectedReservation({ _id: reservationId });
		}
	}, [
		location.search,
		reservations,
		selectedReservation,
		setSelectedReservation,
	]);

	useEffect(() => {
		if (!selectedReservation) {
			setModalReservation(null);
			setHotelDetails(null);
			return;
		}

		let isMounted = true;
		const hotelId = normalizeId(selectedReservation.hotelId);
		const selectedOwnerId = normalizeOwnerId(selectedReservation, ownerId);
		setLoading(true);

		const loadDetails = async () => {
			const freshReservation = selectedReservation._id
				? await singlePreReservationById(selectedReservation._id, {
						view: "details",
				  }).catch(() => null)
				: null;
			const usableReservation =
				freshReservation && !freshReservation.error && !freshReservation.message
					? freshReservation
					: {};
			const reservationHotel =
				hasHotelRoomDetails(usableReservation.hotelId) && usableReservation.hotelId;
			const selectedHotel =
				hasHotelRoomDetails(selectedReservation.hotelId) &&
				selectedReservation.hotelId;
			const fallbackHotelId =
				normalizeId(usableReservation.hotelId) ||
				normalizeId(selectedReservation.hotelId);
			const freshHotel =
				reservationHotel ||
				selectedHotel ||
				(fallbackHotelId
					? await getHotelById(fallbackHotelId, {
							view: "reservation-details",
					  }).catch(() => null)
					: null);
			return { freshReservation: usableReservation, freshHotel };
		};

		loadDetails()
			.then(({ freshReservation, freshHotel }) => {
				if (!isMounted) return;
				const normalizedReservation = normalizeReservationForDetail(
					freshReservation,
					selectedReservation,
					selectedOwnerId
				);
				const normalizedHotel =
					normalizeHotelDetails(freshHotel, selectedOwnerId) ||
					normalizeHotelDetails(freshReservation.hotelId, selectedOwnerId) ||
					normalizeHotelDetails(
						{
							_id: hotelId,
							hotelName: selectedReservation.hotelName || "",
							belongsTo: selectedOwnerId,
						},
						selectedOwnerId
					);
				setModalReservation(normalizedReservation);
				setHotelDetails(normalizedHotel);
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [ownerId, selectedKey, selectedReservation]);

	const closeReservation = () => {
		setSelectedReservation(null);
		setModalReservation(null);
		setHotelDetails(null);
		setModalKey((previous) => previous + 1);
		const params = new URLSearchParams(location.search || "");
		params.delete("reservationId");
		const search = params.toString();
		history.replace({
			pathname: location.pathname,
			search: search ? `?${search}` : "",
		});
	};

	const setReservationFromDetail = useCallback(
		(nextReservation) => {
			const resolved =
				typeof nextReservation === "function"
					? nextReservation(modalReservation)
					: nextReservation;
			if (!resolved) return;
			const normalized = normalizeReservationForDetail(
				resolved,
				modalReservation || selectedReservation,
				ownerId
			);
			setModalReservation(normalized);
			setSelectedReservation(normalized);
			if (typeof onReservationUpdated === "function") {
				onReservationUpdated(normalized);
			}
		},
		[
			modalReservation,
			onReservationUpdated,
			ownerId,
			selectedReservation,
			setSelectedReservation,
		]
	);

	const modalBody = useMemo(() => {
		if (loading) {
			return (
				<LoadingPanel>
					<Spin size='large' />
					<span>{labels.loading}</span>
				</LoadingPanel>
			);
		}
		if (!modalReservation || !hotelDetails) return null;
		return (
			<ReservationDetail
				reservation={modalReservation}
				setReservation={setReservationFromDetail}
				hotelDetails={hotelDetails}
			/>
		);
	}, [hotelDetails, labels.loading, loading, modalReservation, setReservationFromDetail]);

	return (
		<>
			<ReservationDetailsModalGlobalStyle />
			<Modal
				key={modalKey}
				title={null}
				open={!!selectedReservation}
				onCancel={closeReservation}
				footer={null}
				width='min(94vw, calc(100vw - 220px))'
				centered
				zIndex={RESERVATION_DETAILS_MODAL_Z_INDEX}
				rootClassName='reservation-details-modal-root'
				className={`reservation-details-modal${isRTL ? " is-rtl" : ""}`}
				destroyOnClose
				styles={{
					header: { display: "none" },
					content: { padding: "6px 10px 8px" },
					body: {
						maxHeight: "86vh",
						overflowY: "auto",
						padding: "0",
					},
				}}
			>
				<ModalBodyDirection $isRTL={isRTL}>{modalBody}</ModalBodyDirection>
			</Modal>
		</>
	);
};

export default OverallReservationDetailsModal;

export const setReservationIdInQuery = (history, location, reservation = {}) => {
	const params = new URLSearchParams(location.search || "");
	const key = getReservationKey(reservation);
	if (!key) return;
	params.set("reservationId", key);
	history.replace({
		pathname: location.pathname,
		search: `?${params.toString()}`,
	});
};

const ReservationDetailsModalGlobalStyle = createGlobalStyle`
	.reservation-details-modal-root .ant-modal-mask {
		background: rgba(15, 23, 42, 0.62) !important;
		backdrop-filter: blur(2px);
		z-index: ${RESERVATION_DETAILS_MODAL_Z_INDEX - 1} !important;
	}

	.reservation-details-modal-root .ant-modal-wrap,
	.reservation-details-modal-root .ant-modal {
		z-index: ${RESERVATION_DETAILS_MODAL_Z_INDEX} !important;
	}

	.reservation-details-modal {
		max-width: min(94vw, calc(100vw - 220px));
	}

	.reservation-details-modal .ant-modal-close {
		align-items: center;
		background: #7f1d1d;
		border: 1px solid #991b1b;
		border-radius: 999px;
		color: #fff;
		display: inline-flex;
		height: 30px;
		justify-content: center;
		right: 8px;
		top: 6px;
		width: 30px;
		z-index: 5;
	}

	.reservation-details-modal .ant-modal-close:hover {
		background: #991b1b;
		border-color: #b91c1c;
	}

	.reservation-details-modal.is-rtl .ant-modal-close {
		left: 8px;
		right: auto;
	}

	.reservation-details-modal .ant-modal-close-x,
	.reservation-details-modal .ant-modal-close-icon {
		color: #fff;
		font-size: 14px;
		line-height: 1;
	}

	.reservation-details-modal .ant-modal-body {
		padding-top: 0 !important;
	}

	@media (max-width: 900px) {
		.reservation-details-modal {
			max-width: calc(100vw - 12px);
			width: calc(100vw - 12px) !important;
		}
	}
`;

const LoadingPanel = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	gap: 0.8rem;
	min-height: 280px;

	span {
		color: #18212f;
		font-weight: 900;
	}
`;

const ModalBodyDirection = styled.div`
	direction: ${(props) => (props.$isRTL ? "rtl" : "ltr")};
`;
