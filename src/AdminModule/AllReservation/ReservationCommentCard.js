import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Modal } from "antd";
import styled from "styled-components";

const COMMENT_TEXT = {
	en: {
		label: "Comment",
		open: "Open full comment",
		more: "View all",
		title: "Reservation comment",
		close: "Close",
	},
	ar: {
		label: "\u0645\u0644\u0627\u062d\u0638\u0629",
		open: "\u0639\u0631\u0636 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629 \u0643\u0627\u0645\u0644\u0629",
		more: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
		title: "\u0645\u0644\u0627\u062d\u0638\u0629 \u0627\u0644\u062d\u062c\u0632",
		close: "\u0625\u063a\u0644\u0627\u0642",
	},
};

export const isCommentPreviewOverflowing = (element) =>
	Boolean(element && element.scrollHeight > element.clientHeight + 1);

const CommentModalBody = styled.div`
	display: grid;
	gap: 18px;

	.reservation-comment-full-text {
		background: #f8fafc;
		border: 1px solid #dbeafe;
		border-radius: 12px;
		color: #172554;
		font-size: 0.95rem;
		font-weight: 700;
		line-height: 1.85;
		margin: 0;
		max-height: min(58vh, 520px);
		overflow-wrap: anywhere;
		overflow-y: auto;
		padding: 16px;
		text-align: start;
		unicode-bidi: plaintext;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.reservation-comment-close {
		background: #1677ff;
		border: 0;
		border-radius: 9px;
		color: #ffffff;
		cursor: pointer;
		font-weight: 800;
		justify-self: end;
		min-width: 96px;
		padding: 9px 18px;
	}

	.reservation-comment-close:focus-visible {
		box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.22);
		outline: 2px solid #1d4ed8;
		outline-offset: 2px;
	}
`;

const ReservationCommentCard = ({
	comment,
	isArabic = false,
	icon,
	modalProps = {},
}) => {
	const text = typeof comment === "string" ? comment.trim() : "";
	const labels = COMMENT_TEXT[isArabic ? "ar" : "en"];
	const previewRef = useRef(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);

	const measurePreview = useCallback(() => {
		setIsOverflowing(isCommentPreviewOverflowing(previewRef.current));
	}, []);

	useLayoutEffect(() => {
		measurePreview();
		const preview = previewRef.current;
		if (!preview) return undefined;

		window.addEventListener("resize", measurePreview);
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(measurePreview);
		observer?.observe(preview);

		return () => {
			window.removeEventListener("resize", measurePreview);
			observer?.disconnect();
		};
	}, [measurePreview, text]);

	return (
		<>
			<div className='detail-item guest-comment-card'>
				<span className='detail-icon'>{icon}</span>
				<span className='detail-label'>{labels.label}</span>
				<button
					type='button'
					className='detail-value guest-comment-trigger'
					dir={isArabic ? "rtl" : "ltr"}
					disabled={!text || !isOverflowing}
					onClick={() => setModalOpen(true)}
					aria-label={isOverflowing ? labels.open : undefined}
					aria-expanded={isOverflowing ? modalOpen : undefined}
					aria-haspopup={isOverflowing ? "dialog" : undefined}
				>
					<span className='guest-comment-preview' dir='auto' ref={previewRef}>
						{text || "N/A"}
					</span>
					{isOverflowing ? (
						<span className='guest-comment-more' aria-hidden='true'>
							{"\u2026"} {labels.more}
						</span>
					) : null}
				</button>
			</div>

			<Modal
				{...modalProps}
				open={modalOpen}
				onCancel={() => setModalOpen(false)}
				footer={null}
				centered
				destroyOnClose
				width={680}
				style={{
					maxWidth: "calc(100vw - 24px)",
					...(modalProps.style || {}),
				}}
				title={
					<span
						dir={isArabic ? "rtl" : "ltr"}
						style={{ display: "block", textAlign: "start" }}
					>
						{labels.title}
					</span>
				}
			>
				<CommentModalBody dir={isArabic ? "rtl" : "ltr"}>
					<p className='reservation-comment-full-text' dir='auto'>
						{text}
					</p>
					<button
						type='button'
						className='reservation-comment-close'
						onClick={() => setModalOpen(false)}
					>
						{labels.close}
					</button>
				</CommentModalBody>
			</Modal>
		</>
	);
};

export default ReservationCommentCard;
