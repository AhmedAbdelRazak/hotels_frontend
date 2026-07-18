import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import styled from "styled-components";

export const MIN_RECEIPT_SCALE = 0.62;

export const calculateReceiptScale = ({
  availableHeight,
  availableWidth,
  contentHeight,
  contentWidth,
  fitEnabled = true,
  minScale = MIN_RECEIPT_SCALE,
}) => {
  if (
    !fitEnabled ||
    !availableHeight ||
    !availableWidth ||
    !contentHeight ||
    !contentWidth
  ) {
    return 1;
  }

  const fittedScale = Math.min(
    1,
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );
  return Math.max(minScale, fittedScale);
};

/**
 * Fits a normal desktop receipt inside the visible modal area. Very tall or
 * narrow receipts retain a readable minimum scale and let the modal scroll.
 * The receipt itself stays at its natural dimensions for PDF capture.
 */
export default function ReceiptViewport({ children }) {
  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const [layout, setLayout] = useState({ height: "auto", scale: 1 });

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    const receipt = stage?.firstElementChild;
    if (!viewport || !stage || !receipt) return;

    const viewportTop = viewport.getBoundingClientRect().top;
    const modalBoundary = viewport.closest(
      ".ant-modal-content, [data-receipt-viewport-boundary]",
    );
    const boundaryBottom = modalBoundary
      ? Math.min(
          window.innerHeight,
          modalBoundary.getBoundingClientRect().bottom,
        )
      : window.innerHeight;
    const boundaryPaddingBottom = modalBoundary
      ? parseFloat(window.getComputedStyle(modalBoundary).paddingBottom) || 0
      : 24;
    const availableHeight = Math.max(
      520,
      boundaryBottom - viewportTop - boundaryPaddingBottom - 8,
    );
    const availableWidth = viewport.clientWidth;
    const contentWidth = receipt.offsetWidth || receipt.scrollWidth;
    const contentHeight = receipt.offsetHeight || receipt.scrollHeight;
    if (!contentWidth || !contentHeight) return;
    const fitEnabled = window.innerWidth >= 900 && availableWidth >= 780;
    const scale = calculateReceiptScale({
      availableHeight,
      availableWidth,
      contentHeight,
      contentWidth,
      fitEnabled,
    });
    const height = Math.ceil(contentHeight * scale);

    setLayout((current) =>
      current.scale === scale && current.height === height
        ? current
        : { height, scale },
    );
  }, []);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);

    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (observer) {
      observer.observe(viewportRef.current);
      observer.observe(stageRef.current);
      if (stageRef.current?.firstElementChild) {
        observer.observe(stageRef.current.firstElementChild);
      }
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [measure]);

  return (
    <Viewport ref={viewportRef} style={{ height: layout.height }}>
      <Stage ref={stageRef} style={{ transform: `scale(${layout.scale})` }}>
        {children}
      </Stage>
    </Viewport>
  );
}

const Viewport = styled.div`
  position: relative;
  width: 100%;
  min-height: 1px;
`;

const Stage = styled.div`
  width: min(1080px, 100%);
  margin: 0 auto;
  transform-origin: top center;
`;
