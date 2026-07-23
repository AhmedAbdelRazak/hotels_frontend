import React, { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";

const BofaHostedCheckoutFrame = ({ session, onSecurityError }) => {
	const frameRef = useRef(null);
	const submittedSessionRef = useRef("");
	const frameName = useMemo(
		() => `bofa-hosted-checkout-${Math.random().toString(36).slice(2)}`,
		[],
	);

	useEffect(() => {
		if (!session?.endpointUrl || !session?.fields) return;
		try {
			if (window.self !== window.top) {
				onSecurityError?.(
					"For security, open this reservation page directly before entering card details.",
				);
				return;
			}
		} catch (_error) {
			onSecurityError?.(
				"For security, open this reservation page directly before entering card details.",
			);
			return;
		}

		const sessionId = String(session?.session?.transactionUuid || "");
		if (!sessionId || submittedSessionRef.current === sessionId) return;
		submittedSessionRef.current = sessionId;

		const form = document.createElement("form");
		form.method = "POST";
		form.action = session.endpointUrl;
		form.target = frameName;
		form.acceptCharset = "UTF-8";
		form.style.display = "none";
		Object.entries(session.fields).forEach(([name, value]) => {
			const input = document.createElement("input");
			input.type = "hidden";
			input.name = name;
			input.value = String(value ?? "");
			form.appendChild(input);
		});
		document.body.appendChild(form);
		form.submit();
		form.remove();
	}, [frameName, onSecurityError, session]);

	return (
		<FrameShell>
			<iframe
				ref={frameRef}
				name={frameName}
				title='Secure Bank of America card form'
				referrerPolicy='strict-origin-when-cross-origin'
			/>
		</FrameShell>
	);
};

export default BofaHostedCheckoutFrame;

const FrameShell = styled.div`
	width: 100%;
	min-height: 520px;
	margin-top: 12px;
	border: 1px solid #cbd5e1;
	border-radius: 10px;
	overflow: hidden;
	background: #fff;

	iframe {
		display: block;
		width: 100%;
		height: 520px;
		border: 0;
		background: #fff;
	}
`;
