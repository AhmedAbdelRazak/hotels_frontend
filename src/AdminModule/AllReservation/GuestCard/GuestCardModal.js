/** @format */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Spin } from "antd";
import {
  DownloadOutlined,
  FileImageOutlined,
  IdcardOutlined,
  MailOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "react-toastify";
import {
  emailAdminReservationGuestCard,
  getAdminReservationGuestCard,
} from "../../apiAdmin";
import GuestCard from "./GuestCard";
import {
  GUEST_CARD_HEIGHT,
  GUEST_CARD_WIDTH,
  calculateGuestCardPreviewScale,
  downloadGuestCardPdf,
  downloadGuestCardPng,
  isValidGuestCardEmail,
  normalizeGuestCardEmail,
} from "./guestCardData";
import "./GuestCardModal.css";

const COPY = {
  en: {
    title: "Guest Card",
    loading: "Preparing the official Guest Card…",
    loadError: "The Guest Card could not be loaded.",
    retry: "Try again",
    recipient: "Recipient email",
    recipientHelp: "The attached PDF will be sent only to this email address.",
    downloadPdf: "Download PDF",
    downloadPng: "Download PNG",
    downloadingPdf: "Preparing PDF…",
    downloadingPng: "Preparing PNG…",
    send: "Email Guest Card",
    sending: "Sending…",
    sent: "Sent",
    invalidEmail: "Enter one valid email address.",
    downloadedPdf: "Guest Card PDF downloaded.",
    downloadedPng: "Guest Card PNG downloaded.",
    downloadErrorPdf: "The Guest Card PDF could not be downloaded.",
    downloadErrorPng: "The Guest Card PNG could not be downloaded.",
    emailSuccess: "Guest Card emailed successfully.",
  },
  ar: {
    title: "بطاقة الضيف",
    loading: "جاري تجهيز بطاقة الضيف الرسمية…",
    loadError: "تعذر تحميل بطاقة الضيف.",
    retry: "إعادة المحاولة",
    recipient: "البريد الإلكتروني للمستلم",
    recipientHelp: "سيتم إرسال ملف PDF المرفق إلى هذا البريد فقط.",
    downloadPdf: "تحميل PDF",
    downloadPng: "تحميل PNG",
    downloadingPdf: "جاري تجهيز PDF…",
    downloadingPng: "جاري تجهيز PNG…",
    send: "إرسال بطاقة الضيف",
    sending: "جاري الإرسال…",
    sent: "تم الإرسال",
    invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صالح واحد.",
    downloadedPdf: "تم تحميل بطاقة الضيف بصيغة PDF.",
    downloadedPng: "تم تحميل بطاقة الضيف بصيغة PNG.",
    downloadErrorPdf: "تعذر تحميل بطاقة الضيف بصيغة PDF.",
    downloadErrorPng: "تعذر تحميل بطاقة الضيف بصيغة PNG.",
    emailSuccess: "تم إرسال بطاقة الضيف بنجاح.",
  },
};

const GuestCardModal = ({
  open,
  onClose,
  reservationId,
  userId,
  token,
  isArabic = false,
  modalProps = {},
}) => {
  const text = COPY[isArabic ? "ar" : "en"];
  const cardRef = useRef(null);
  const previewViewportRef = useRef(null);
  const requestSequence = useRef(0);
  const operationRef = useRef("");
  const [card, setCard] = useState(null);
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState("");
  const [previewScale, setPreviewScale] = useState(0);
  const [lastSentEmail, setLastSentEmail] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const controller =
      typeof AbortController === "function" ? new AbortController() : null;
    const sequence = ++requestSequence.current;
    setCard(null);
    setEmail("");
    setLoadError("");
    setLastSentEmail("");
    setLoading(true);
    getAdminReservationGuestCard(reservationId, userId, token, {
      signal: controller?.signal,
    })
      .then((response) => {
        if (sequence !== requestSequence.current) return;
        if (!response?.success || !response?.card) {
          setLoadError(response?.error || text.loadError);
          return;
        }
        setCard(response.card);
        setEmail(response.card.guestEmail || "");
      })
      .catch((error) => {
        if (
          sequence !== requestSequence.current ||
          error?.name === "AbortError"
        )
          return;
        setLoadError(error?.message || text.loadError);
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
    return () => {
      requestSequence.current += 1;
      controller?.abort();
    };
  }, [open, reservationId, retryVersion, text.loadError, token, userId]);

  useLayoutEffect(() => {
    const viewport = previewViewportRef.current;
    if (!open || !card || !viewport) {
      setPreviewScale((current) => (current === 0 ? current : 0));
      return undefined;
    }

    let frameId = null;
    const windowImpl = typeof window !== "undefined" ? window : null;
    const measure = () => {
      frameId = null;
      const nextScale = calculateGuestCardPreviewScale(
        viewport.clientWidth,
        viewport.clientHeight,
      );
      setPreviewScale((current) =>
        Math.abs(current - nextScale) > 0.001 ? nextScale : current,
      );
    };
    const scheduleMeasure = () => {
      if (frameId !== null) return;
      if (typeof windowImpl?.requestAnimationFrame === "function") {
        frameId = windowImpl.requestAnimationFrame(measure);
      } else {
        measure();
      }
    };

    measure();
    const ResizeObserverImpl = windowImpl?.ResizeObserver;
    const observer = ResizeObserverImpl
      ? new ResizeObserverImpl(scheduleMeasure)
      : null;
    observer?.observe(viewport);
    windowImpl?.addEventListener?.("resize", scheduleMeasure);

    return () => {
      observer?.disconnect();
      windowImpl?.removeEventListener?.("resize", scheduleMeasure);
      if (
        frameId !== null &&
        typeof windowImpl?.cancelAnimationFrame === "function"
      ) {
        windowImpl.cancelAnimationFrame(frameId);
      }
    };
  }, [card, open]);

  const normalizedEmail = normalizeGuestCardEmail(email);
  const alreadySent = Boolean(
    lastSentEmail && normalizedEmail === lastSentEmail,
  );

  const beginOperation = (name) => {
    if (operationRef.current) return false;
    operationRef.current = name;
    setOperation(name);
    return true;
  };

  const finishOperation = (name) => {
    if (operationRef.current !== name) return;
    operationRef.current = "";
    setOperation("");
  };

  const handleDownload = async (format) => {
    const operationName = `download-${format}`;
    if (!card || !beginOperation(operationName)) return;
    try {
      if (format === "png") {
        await downloadGuestCardPng({
          element: cardRef.current,
          confirmationNumber: card.confirmationNumber,
          html2canvasImpl: html2canvas,
        });
        toast.success(text.downloadedPng);
      } else {
        await downloadGuestCardPdf({
          element: cardRef.current,
          confirmationNumber: card.confirmationNumber,
          html2canvasImpl: html2canvas,
          jsPDFImpl: jsPDF,
        });
        toast.success(text.downloadedPdf);
      }
    } catch (error) {
      console.error("Guest Card download failed", error);
      toast.error(
        format === "png" ? text.downloadErrorPng : text.downloadErrorPdf,
      );
    } finally {
      finishOperation(operationName);
    }
  };

  const handleEmail = async () => {
    if (!card || operationRef.current || alreadySent) return;
    if (!isValidGuestCardEmail(email)) {
      toast.error(text.invalidEmail);
      return;
    }
    if (!beginOperation("email")) return;
    try {
      const response = await emailAdminReservationGuestCard(
        reservationId,
        userId,
        token,
        normalizedEmail,
      );
      if (!response?.success)
        throw new Error(response?.error || text.loadError);
      setLastSentEmail(normalizedEmail);
      toast.success(text.emailSuccess);
    } catch (error) {
      toast.error(error?.message || text.loadError);
    } finally {
      finishOperation("email");
    }
  };

  const handleClose = () => {
    if (operationRef.current) return;
    onClose?.();
  };

  const busy = Boolean(operation);
  const downloadingPdf = operation === "download-pdf";
  const downloadingPng = operation === "download-png";
  const sending = operation === "email";

  return (
    <Modal
      title={
        <span className="guest-card-modal-title">
          <IdcardOutlined /> {text.title}
        </span>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={1280}
      centered
      destroyOnClose
      maskClosable={false}
      keyboard={!busy}
      closable={!busy}
      className="guest-card-modal"
      {...modalProps}
    >
      {loading ? (
        <div className="guest-card-modal-loading" aria-live="polite">
          <Spin size="large" />
          <strong>{text.loading}</strong>
        </div>
      ) : loadError ? (
        <div className="guest-card-modal-error">
          <Alert
            type="error"
            showIcon
            message={text.loadError}
            description={loadError}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setRetryVersion((value) => value + 1)}
          >
            {text.retry}
          </Button>
        </div>
      ) : card ? (
        <div className="guest-card-modal-body" dir={isArabic ? "rtl" : "ltr"}>
          <div className="guest-card-controls">
            <div className="guest-card-email-field">
              <label htmlFor="guest-card-recipient-email">
                {text.recipient}
              </label>
              <Input
                id="guest-card-recipient-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="guest@example.com"
                autoComplete="email"
                maxLength={254}
                disabled={busy}
                status={
                  email && !isValidGuestCardEmail(email) ? "error" : undefined
                }
                prefix={<MailOutlined />}
              />
              <small>{text.recipientHelp}</small>
            </div>
            <div className="guest-card-control-actions">
              <Button
                size="large"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload("pdf")}
                loading={downloadingPdf}
                disabled={busy && !downloadingPdf}
              >
                {downloadingPdf ? text.downloadingPdf : text.downloadPdf}
              </Button>
              <Button
                size="large"
                icon={<FileImageOutlined />}
                onClick={() => handleDownload("png")}
                loading={downloadingPng}
                disabled={busy && !downloadingPng}
              >
                {downloadingPng ? text.downloadingPng : text.downloadPng}
              </Button>
              <Button
                type="primary"
                size="large"
                className="guest-card-email-action"
                icon={<MailOutlined />}
                onClick={handleEmail}
                loading={sending}
                disabled={
                  (busy && !sending) ||
                  alreadySent ||
                  !isValidGuestCardEmail(email)
                }
              >
                {sending ? text.sending : alreadySent ? text.sent : text.send}
              </Button>
            </div>
          </div>
          <div className="guest-card-preview-frame" dir="ltr">
            <div
              className="guest-card-preview-viewport"
              ref={previewViewportRef}
            >
              <div
                className="guest-card-preview-shell"
                style={{
                  height: GUEST_CARD_HEIGHT * previewScale,
                  width: GUEST_CARD_WIDTH * previewScale,
                }}
              >
                <div
                  className="guest-card-preview-scale-content"
                  style={{
                    height: GUEST_CARD_HEIGHT,
                    transform: `scale(${previewScale})`,
                    visibility: previewScale > 0 ? "visible" : "hidden",
                    width: GUEST_CARD_WIDTH,
                  }}
                >
                  <GuestCard card={card} ref={cardRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default GuestCardModal;
