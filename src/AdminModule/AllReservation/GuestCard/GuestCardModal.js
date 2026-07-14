/** @format */

import React, { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Modal, Spin } from "antd";
import {
  DownloadOutlined,
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
  downloadGuestCardPdf,
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
    download: "Download PDF",
    downloading: "Preparing PDF…",
    send: "Email Guest Card",
    sending: "Sending…",
    sent: "Sent",
    invalidEmail: "Enter one valid email address.",
    downloaded: "Guest Card PDF downloaded.",
    downloadError: "The Guest Card PDF could not be downloaded.",
    emailSuccess: "Guest Card emailed successfully.",
  },
  ar: {
    title: "بطاقة الضيف",
    loading: "جاري تجهيز بطاقة الضيف الرسمية…",
    loadError: "تعذر تحميل بطاقة الضيف.",
    retry: "إعادة المحاولة",
    recipient: "البريد الإلكتروني للمستلم",
    recipientHelp: "سيتم إرسال ملف PDF المرفق إلى هذا البريد فقط.",
    download: "تحميل PDF",
    downloading: "جاري تجهيز PDF…",
    send: "إرسال بطاقة الضيف",
    sending: "جاري الإرسال…",
    sent: "تم الإرسال",
    invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صالح واحد.",
    downloaded: "تم تحميل بطاقة الضيف بصيغة PDF.",
    downloadError: "تعذر تحميل بطاقة الضيف بصيغة PDF.",
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
  const requestSequence = useRef(0);
  const [card, setCard] = useState(null);
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
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

  const normalizedEmail = normalizeGuestCardEmail(email);
  const alreadySent = Boolean(
    lastSentEmail && normalizedEmail === lastSentEmail,
  );

  const handleDownload = async () => {
    if (!card || downloading) return;
    setDownloading(true);
    try {
      await downloadGuestCardPdf({
        element: cardRef.current,
        confirmationNumber: card.confirmationNumber,
        html2canvasImpl: html2canvas,
        jsPDFImpl: jsPDF,
      });
      toast.success(text.downloaded);
    } catch (error) {
      console.error("Guest Card download failed", error);
      toast.error(text.downloadError);
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = async () => {
    if (!card || sending || alreadySent) return;
    if (!isValidGuestCardEmail(email)) {
      toast.error(text.invalidEmail);
      return;
    }
    setSending(true);
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
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending || downloading) return;
    onClose?.();
  };

  const busy = sending || downloading;

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
                disabled={sending}
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
                onClick={handleDownload}
                loading={downloading}
                disabled={sending}
              >
                {downloading ? text.downloading : text.download}
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<MailOutlined />}
                onClick={handleEmail}
                loading={sending}
                disabled={
                  downloading || alreadySent || !isValidGuestCardEmail(email)
                }
              >
                {sending ? text.sending : alreadySent ? text.sent : text.send}
              </Button>
            </div>
          </div>
          <div className="guest-card-preview-scroll" dir="ltr">
            <GuestCard card={card} ref={cardRef} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default GuestCardModal;
