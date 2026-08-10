import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReservationCommentCard, {
	isCommentPreviewOverflowing,
} from "./ReservationCommentCard";

describe("ReservationCommentCard", () => {
	test("keeps a short comment compact and non-interactive", () => {
		render(<ReservationCommentCard comment='Late arrival' icon={<span>i</span>} />);

		const preview = screen.getByRole("button", { name: "Late arrival" });
		expect(preview.disabled).toBe(true);
		expect(screen.queryByText(/View all/i)).toBeNull();
	});

	test("opens the full multiline comment when the three-line preview overflows", async () => {
		const originalScrollHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			"scrollHeight",
		);
		const originalClientHeight = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			"clientHeight",
		);
		Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
			configurable: true,
			get: () => 96,
		});
		Object.defineProperty(HTMLElement.prototype, "clientHeight", {
			configurable: true,
			get: () => 48,
		});

		try {
			const comment = "Special requests\nPlease contact the guest\nLong provider note";
			render(
				<ReservationCommentCard
					comment={comment}
					icon={<span>i</span>}
					isArabic
				/>,
			);

			const preview = await screen.findByRole("button", {
				name: "عرض الملاحظة كاملة",
			});
			const clampedText = document.querySelector(".guest-comment-preview");
			expect(clampedText.getAttribute("dir")).toBe("auto");
			expect(preview.getAttribute("aria-haspopup")).toBe("dialog");
			expect(preview.getAttribute("aria-expanded")).toBe("false");
			expect(screen.getByText(/عرض الكل/)).not.toBeNull();

			fireEvent.click(screen.getByText(/عرض الكل/));
			expect(await screen.findByText("ملاحظة الحجز")).not.toBeNull();
			expect(preview.getAttribute("aria-expanded")).toBe("true");
			const fullText = document.querySelector(
				".reservation-comment-full-text",
			);
			expect(fullText.textContent).toBe(comment);
			expect(fullText.getAttribute("dir")).toBe("auto");
			expect(fullText.classList.contains("reservation-comment-full-text")).toBe(
				true,
			);

			fireEvent.click(screen.getByRole("button", { name: "إغلاق" }));
			await waitFor(() =>
				expect(screen.queryByText("ملاحظة الحجز")).toBeNull(),
			);
		} finally {
			if (originalScrollHeight) {
				Object.defineProperty(
					HTMLElement.prototype,
					"scrollHeight",
					originalScrollHeight,
				);
			} else {
				delete HTMLElement.prototype.scrollHeight;
			}
			if (originalClientHeight) {
				Object.defineProperty(
					HTMLElement.prototype,
					"clientHeight",
					originalClientHeight,
				);
			} else {
				delete HTMLElement.prototype.clientHeight;
			}
		}
	});

	test("uses a small rounding allowance when checking measured overflow", () => {
		expect(
			isCommentPreviewOverflowing({ scrollHeight: 51, clientHeight: 50 }),
		).toBe(false);
		expect(
			isCommentPreviewOverflowing({ scrollHeight: 52, clientHeight: 50 }),
		).toBe(true);
	});
});
