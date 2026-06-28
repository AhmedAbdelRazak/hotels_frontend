# PMS Settings Payload Health - 2026-06-28

## Frontend contract

The settings UI must avoid loading full room calendar arrays unless the user is editing a specific room calendar.

## Overall Calendar Pricing

- Initial load uses `getOverallCalendarPricingOptions`.
- The response should contain compact `hotels`, `agents`, `priceVariantData`, and `pricingGroups`.
- The Update Pricing tab should list `pricingGroups`.
- Clicking a saved pricing card calls `getOverallCalendarPricingRoomRows` for that one room, then opens the update preview.
- Owner-level settings links should use `/hotel-management/main-dashboard?ownerId=<ownerId>&overall=settings&page=1`.
- Deep links may add `settingsModal=calendar&settingsCalendarTab=general`, `settingsModal=rooms&settingsRoomTab=add|update`, or `settingsModal=price-variants&settingsPriceVariantTab=add|update|agents`.
- The overall settings page canonicalizes stale reservation/summary/map query params away before opening modals, so old dashboard filters do not trigger unrelated loading or repeated route changes.

## Single Hotel Settings

- `getHotelById(..., { view: "management" })` is compact by default.
- `includePricingRows: true` should only be passed when the room-count wizard is on pricing step 3.
- Compact room rows are marked with `pricingRowsOmitted` so moving from step 1 to step 3 hydrates the selected room before editing pricing.
