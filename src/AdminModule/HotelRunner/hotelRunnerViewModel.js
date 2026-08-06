/** @format */

const count = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const totalFor = (source = {}, keys = []) =>
  keys.reduce((sum, key) => sum + count(source?.[key]), 0);

export const summarizeHotelRunnerStatus = (status = {}) => {
  const configuration = status.configuration || {};
  const queue = status.queue || {};
  const projections = status.projections || {};
  return {
    configurationReady: Boolean(
      configuration.tokenConfigured &&
        configuration.hrIdConfigured &&
        count(configuration.supportedPropertyCount) > 0,
    ),
    waiting: totalFor(queue, ["pending", "processing", "retry"]),
    needsMapping: count(queue.needs_mapping),
    attention: totalFor(queue, ["quarantined", "failed"]),
    processed: totalFor(queue, ["completed", "ignored"]),
    projected: totalFor(projections, ["created", "updated", "cancelled"]),
  };
};

export const roomOptionLabel = (room = {}) => {
  const displayName = String(
    room.displayName || room.roomType || "Room",
  ).trim();
  const roomType = String(room.roomType || "").trim();
  const countLabel = Number.isFinite(Number(room.count))
    ? ` (${Number(room.count)} rooms)`
    : "";
  return `${displayName}${
    roomType && roomType !== displayName ? ` — ${roomType}` : ""
  }${countLabel}`;
};

export const mergeMappingUpdate = (mapping = {}, update = {}) => ({
  ...mapping,
  ...update,
  _id: update._id || mapping._id,
  localRoomTypeId:
    update.localRoomTypeId === undefined
      ? mapping.localRoomTypeId || null
      : update.localRoomTypeId,
  version:
    update.version === undefined
      ? Number(mapping.version || 0)
      : Number(update.version),
});

export const mappingHasUnsavedSelection = (mapping = {}, selectedRoomId = "") =>
  String(mapping.localRoomTypeId || "") !== String(selectedRoomId || "");

export const canActivateMapping = (mapping = {}, selectedRoomId = "") =>
  mapping.isMaster !== true &&
  mapping.roomListVerified === true &&
  Boolean(String(selectedRoomId || "").trim());
