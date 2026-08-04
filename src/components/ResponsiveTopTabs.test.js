import {
  PHONE_TOP_TABS_BREAKPOINT,
  PHONE_TOP_TABS_COLUMNS,
  responsiveTopTabColumns,
  twoColumnPhoneTopTabs,
} from "./ResponsiveTopTabs";

test("report top tabs use two columns only at phone widths", () => {
  expect(responsiveTopTabColumns(320)).toBe(2);
  expect(responsiveTopTabColumns(375)).toBe(2);
  expect(responsiveTopTabColumns(412)).toBe(2);
  expect(responsiveTopTabColumns(PHONE_TOP_TABS_BREAKPOINT)).toBe(
    PHONE_TOP_TABS_COLUMNS,
  );
  expect(responsiveTopTabColumns(PHONE_TOP_TABS_BREAKPOINT + 1)).toBeNull();
});

test("shared phone tab styles keep labels readable without horizontal scrolling", () => {
  const serializedStyles = twoColumnPhoneTopTabs.flat(Infinity).join("");
  expect(serializedStyles).toContain("grid-template-columns: repeat(");
  expect(serializedStyles).toContain("minmax(0, 1fr)");
  expect(serializedStyles).toContain("overflow-x: visible");
  expect(serializedStyles).toContain(
    "font-size: clamp(0.82rem, 3.3vw, 0.9rem)",
  );
});
