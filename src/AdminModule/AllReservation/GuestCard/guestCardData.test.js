import {
  GUEST_CARD_CAPTURE_SCALE,
  GUEST_CARD_HEIGHT,
  GUEST_CARD_WIDTH,
  calculateGuestCardPreviewScale,
  downloadGuestCardPdf,
  downloadGuestCardPng,
  guestCardPdfFilename,
  guestCardPngFilename,
  isValidGuestCardEmail,
  normalizeGuestCardEmail,
  prepareGuestCardCaptureClone,
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
    expect(guestCardPngFilename("AB/123 : test")).toBe(
      "Jannat_Guest_Card_AB-123-test.png",
    );
  });

  it("fits the complete fixed-size card without enlarging it", () => {
    expect(calculateGuestCardPreviewScale(1200, 820)).toBe(1);
    expect(calculateGuestCardPreviewScale(2400, 1640)).toBe(1);
    expect(calculateGuestCardPreviewScale(600, 820)).toBe(0.5);
    expect(calculateGuestCardPreviewScale(1200, 410)).toBe(0.5);
    expect(calculateGuestCardPreviewScale(0, 820)).toBe(0);
    expect(calculateGuestCardPreviewScale(Number.NaN, 820)).toBe(0);
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
    expect(html2canvasImpl).toHaveBeenCalledTimes(1);
    expect(html2canvasImpl).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        height: GUEST_CARD_HEIGHT,
        onclone: prepareGuestCardCaptureClone,
        scale: GUEST_CARD_CAPTURE_SCALE,
        width: GUEST_CARD_WIDTH,
      }),
    );
  });

  it("downloads one high-resolution PNG and always releases its object URL", async () => {
    const blob = { size: 1234, type: "image/png" };
    const toBlob = jest.fn((callback) => callback(blob));
    const html2canvasImpl = jest.fn().mockResolvedValue({
      width: 2400,
      height: 1640,
      toBlob,
    });
    const click = jest.fn();
    const remove = jest.fn();
    const anchor = {
      click,
      download: "",
      href: "",
      rel: "",
      remove,
      style: {},
    };
    const documentImpl = {
      body: { appendChild: jest.fn() },
      createElement: jest.fn(() => anchor),
    };
    const urlImpl = {
      createObjectURL: jest.fn(() => "blob:guest-card"),
      revokeObjectURL: jest.fn(),
    };
    const element = {
      scrollWidth: 1200,
      scrollHeight: 820,
      querySelectorAll: jest.fn(() => []),
    };

    const filename = await downloadGuestCardPng({
      element,
      confirmationNumber: "ABC/123",
      html2canvasImpl,
      documentImpl,
      urlImpl,
    });

    expect(filename).toBe("Jannat_Guest_Card_ABC-123.png");
    expect(html2canvasImpl).toHaveBeenCalledTimes(1);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    expect(urlImpl.createObjectURL).toHaveBeenCalledWith(blob);
    expect(documentImpl.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.download).toBe(filename);
    expect(anchor.href).toBe("blob:guest-card");
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(urlImpl.revokeObjectURL).toHaveBeenCalledWith("blob:guest-card");
  });

  it("detaches the cloned card from preview scaling before capture", () => {
    const body = {
      appendChild: jest.fn((element) => {
        element.parentNode = body;
      }),
      style: {},
    };
    const clonedElement = { parentNode: {}, style: {} };

    prepareGuestCardCaptureClone({ body }, clonedElement);

    expect(body.appendChild).toHaveBeenCalledWith(clonedElement);
    expect(clonedElement.style).toEqual(
      expect.objectContaining({
        direction: "ltr",
        height: "820px",
        left: "0",
        position: "absolute",
        top: "0",
        transform: "none",
        visibility: "visible",
        width: "1200px",
      }),
    );
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

  it("stops a stalled PNG encoder and does not create a download URL", async () => {
    jest.useFakeTimers();
    try {
      const toBlob = jest.fn();
      const urlImpl = {
        createObjectURL: jest.fn(),
        revokeObjectURL: jest.fn(),
      };
      const request = downloadGuestCardPng({
        element: {
          querySelectorAll: jest.fn(() => []),
        },
        confirmationNumber: "ABC123",
        html2canvasImpl: jest.fn().mockResolvedValue({
          width: 2400,
          height: 1640,
          toBlob,
        }),
        documentImpl: {
          body: { appendChild: jest.fn() },
          createElement: jest.fn(),
        },
        urlImpl,
      });
      for (let tick = 0; tick < 20 && !toBlob.mock.calls.length; tick += 1) {
        await Promise.resolve();
      }
      expect(toBlob).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(10_000);
      await expect(request).rejects.toThrow(/timed out/i);
      expect(urlImpl.createObjectURL).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
