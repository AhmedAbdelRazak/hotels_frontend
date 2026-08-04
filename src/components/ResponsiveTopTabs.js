import { css } from "styled-components";

export const PHONE_TOP_TABS_BREAKPOINT = 768;
export const PHONE_TOP_TABS_COLUMNS = 2;

export const responsiveTopTabColumns = (viewportWidth) =>
  Number(viewportWidth) <= PHONE_TOP_TABS_BREAKPOINT
    ? PHONE_TOP_TABS_COLUMNS
    : null;

/**
 * Shared phone-only layout for primary page navigation bars. Desktop and tablet
 * rules remain owned by each page so their established themes are unchanged.
 */
export const twoColumnPhoneTopTabs = css`
  @media (max-width: ${PHONE_TOP_TABS_BREAKPOINT}px) {
    display: grid;
    grid-template-columns: repeat(${PHONE_TOP_TABS_COLUMNS}, minmax(0, 1fr));
    align-items: stretch;
    gap: 8px;
    overflow-x: visible;

    button {
      flex: none;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 52px;
      padding: 8px 6px;
      font-size: clamp(0.82rem, 3.3vw, 0.9rem);
      line-height: 1.4;
      text-align: center;
      white-space: normal;
      overflow-wrap: break-word;
    }

    button span {
      max-width: 100%;
      white-space: normal;
    }
  }
`;
