import {
  downloadGuestCardPdf,
  guestCardPdfFilename,
  isValidGuestCardEmail,
  normalizeGuestCardEmail,
} from "./guestCardData";

describe("Guest Card download and recipient helpers", () => {
  it("normalizes one valid recipient and rejects recipient lists", () => {
    expect(normalizeGuestCardEmail(" Guest@Example.com ")).toBe(
      "guest@example.com",
    );
    expect(isValidGuestCardEmail("guest@example.com")).toBe(true);
    expect(isValidGuestCardEmail("a@example.com,b@example.com")).toBe(false);
    expect(isValidGuestCardEmail("a@example.com\r\nBcc:x@example.com")).toBe(
      false,
    );
  });

  it("creates a stable safe filename", () => {
    expect(guestCardPdfFilename("AB/123 : test")).toBe(
      "Jannat_Guest_Card_AB-123-test.pdf",
    );
  });

  it("creates exactly one custom-size page and always uses the safe filename", async () => {
    const addImage = jest.fn();
    const save = jest.fn();
    const jsPDFImpl = jest.fn(() => ({ addImage, save }));
    const html2canvasImpl = jest.fn().mockResolvedValue({
      width: 2400,
      height: 1640,
      toDataURL: jest.fn(() => "data:image/png;base64,card"),
    });
    const element = {
      scrollWidth: 1200,
      scrollHeight: 820,
      querySelectorAll: jest.fn(() => []),
    };

    await downloadGuestCardPdf({
      element,
      confirmationNumber: "ABC/123",
      html2canvasImpl,
      jsPDFImpl,
    });

    expect(jsPDFImpl).toHaveBeenCalledTimes(1);
    expect(jsPDFImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        format: [1200, 820],
        orientation: "landscape",
      }),
    );
    expect(addImage).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("Jannat_Guest_Card_ABC-123.pdf");
  });

  it("fails before invoking PDF tools without a printable card", async () => {
    await expect(
      downloadGuestCardPdf({
        element: null,
        html2canvasImpl: jest.fn(),
        jsPDFImpl: jest.fn(),
      }),
    ).rejects.toThrow("preview is not available");
  });

  it("stops a stalled canvas capture instead of leaving the download busy", async () => {
    jest.useFakeTimers();
    try {
      const html2canvasImpl = jest.fn(() => new Promise(() => {}));
      const request = downloadGuestCardPdf({
        element: {
          scrollWidth: 1200,
          scrollHeight: 820,
          querySelectorAll: jest.fn(() => []),
        },
        confirmationNumber: "ABC123",
        html2canvasImpl,
        jsPDFImpl: jest.fn(),
      });
      for (
        let tick = 0;
        tick < 5 && !html2canvasImpl.mock.calls.length;
        tick += 1
      ) {
        await Promise.resolve();
      }
      expect(html2canvasImpl).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(30_000);
      await expect(request).rejects.toThrow(/timed out/i);
    } finally {
      jest.useRealTimers();
    }
  });
});
