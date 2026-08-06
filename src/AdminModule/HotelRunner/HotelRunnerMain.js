/** @format */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Spin,
  Tag,
  message,
} from "antd";
import {
  ApiOutlined,
  CheckCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import {
  getHotelRunnerAdminStatus,
  getHotelRunnerRoomMappings,
  updateHotelRunnerRoomMapping,
} from "./hotelRunnerApi";
import {
  canActivateMapping,
  mappingHasUnsavedSelection,
  mergeMappingUpdate,
  roomOptionLabel,
  summarizeHotelRunnerStatus,
} from "./hotelRunnerViewModel";

const TEXT = {
  English: {
    title: "HotelRunner integration",
    subtitle:
      "Monitor local ingestion and explicitly connect HotelRunner inventory codes to PMS room categories.",
    refresh: "Refresh local status",
    configuration: "Configuration",
    configured: "Backend configuration ready",
    incomplete: "Backend configuration incomplete",
    property: "Connected PMS property",
    pullEnabled: "Safety reconciliation pull",
    projectionEnabled: "Local reservation projection",
    callback: "Latest callback stored",
    processed: "Latest event processed",
    worker: "Worker state",
    never: "Not reported yet",
    waiting: "Waiting / retrying",
    needsMapping: "Needs room mapping",
    attention: "Needs attention",
    projected: "Projected locally",
    queue: "Local event queue",
    projections: "Local reservation projections",
    roomMappings: "Room mappings",
    roomMappingHelp:
      "Map each HotelRunner inv_code to the exact roomCountDetails ID. Reservations with an unknown code stay safely queued and are not guessed by room name.",
    inventoryCode: "HotelRunner inventory",
    pmsRoom: "Exact PMS room category",
    mappingStatus: "Status",
    actions: "Actions",
    selectRoom: "Select a PMS room category",
    save: "Save mapping",
    disable: "Disable",
    disableConfirm:
      "Disable this mapping? Future reservations using this code will wait for mapping.",
    noMappings:
      "No HotelRunner inventory codes have been discovered yet. They appear after a callback or room-list synchronization.",
    loadFailed: "HotelRunner local status could not be loaded.",
    mappingSaved: "HotelRunner room mapping saved.",
    mappingDisabled: "HotelRunner room mapping disabled.",
    conflict:
      "This mapping changed elsewhere. The latest values were reloaded.",
    active: "Active",
    disabled: "Disabled",
    pending: "Pending",
    conflictStatus: "Conflict",
    enabled: "Enabled",
    held: "Held",
    roomId: "PMS room ID",
    rateCodes: "Rate codes",
    masterBlocked:
      "HotelRunner marks this as master fallback inventory. It cannot be mapped to a real PMS room category.",
    roomListUnverified:
      "Waiting for HotelRunner room-list verification before this inventory code can be mapped.",
  },
  Arabic: {
    title: "تكامل HotelRunner",
    subtitle:
      "راقب الاستيراد المحلي واربط رموز غرف HotelRunner بفئات غرف PMS بشكل صريح.",
    refresh: "تحديث الحالة المحلية",
    configuration: "الإعداد",
    configured: "إعدادات الخادم جاهزة",
    incomplete: "إعدادات الخادم غير مكتملة",
    property: "منشأة PMS المتصلة",
    pullEnabled: "مزامنة التسوية الاحتياطية",
    projectionEnabled: "إسقاط الحجوزات محلياً",
    callback: "آخر callback محفوظ",
    processed: "آخر حدث تمت معالجته",
    worker: "حالة العامل",
    never: "لم يتم الإبلاغ بعد",
    waiting: "قيد الانتظار / المحاولة",
    needsMapping: "يحتاج ربط غرفة",
    attention: "يحتاج مراجعة",
    projected: "تم إسقاطه محلياً",
    queue: "طابور الأحداث المحلي",
    projections: "إسقاطات الحجوزات المحلية",
    roomMappings: "ربط الغرف",
    roomMappingHelp:
      "اربط كل inv_code مع معرف roomCountDetails الدقيق. الحجوزات ذات الرمز غير المعروف تبقى في الطابور بأمان.",
    inventoryCode: "مخزون HotelRunner",
    pmsRoom: "فئة غرفة PMS الدقيقة",
    mappingStatus: "الحالة",
    actions: "الإجراءات",
    selectRoom: "اختر فئة غرفة PMS",
    save: "حفظ الربط",
    disable: "تعطيل",
    disableConfirm: "تعطيل هذا الربط؟ ستنتظر الحجوزات القادمة حتى يتم الربط.",
    noMappings: "لم يتم اكتشاف رموز مخزون HotelRunner بعد.",
    loadFailed: "تعذر تحميل حالة HotelRunner المحلية.",
    mappingSaved: "تم حفظ ربط غرفة HotelRunner.",
    mappingDisabled: "تم تعطيل ربط غرفة HotelRunner.",
    conflict: "تم تعديل الربط في مكان آخر. تم تحميل آخر القيم.",
    active: "نشط",
    disabled: "معطل",
    pending: "معلق",
    conflictStatus: "تعارض",
    enabled: "مفعل",
    held: "متوقف",
    roomId: "معرف غرفة PMS",
    rateCodes: "رموز الأسعار",
    masterBlocked:
      "هذا مخزون احتياطي رئيسي في HotelRunner ولا يمكن ربطه بفئة غرفة فعلية في PMS.",
    roomListUnverified:
      "بانتظار التحقق من هذا الرمز عبر قائمة غرف HotelRunner قبل السماح بربطه.",
  },
};

const QUEUE_ORDER = [
  "pending",
  "processing",
  "retry",
  "needs_mapping",
  "completed",
  "ignored",
  "quarantined",
  "failed",
];
const PROJECTION_ORDER = [
  "pending",
  "created",
  "updated",
  "cancelled",
  "ignored",
  "needs_mapping",
  "quarantined",
];

const idOf = (value) => String(value?._id || value || "").trim();
const friendlyKey = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const statusColor = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "active":
    case "completed":
    case "created":
    case "updated":
      return "green";
    case "cancelled":
    case "disabled":
    case "ignored":
      return "default";
    case "failed":
    case "quarantined":
    case "conflict":
      return "red";
    case "needs_mapping":
    case "retry":
      return "orange";
    default:
      return "blue";
  }
};

const MappingStatusTag = ({ value, copy }) => {
  const normalized = String(value || "pending").toLowerCase();
  const label =
    normalized === "active"
      ? copy.active
      : normalized === "disabled"
        ? copy.disabled
        : normalized === "conflict"
          ? copy.conflictStatus
          : normalized === "pending"
            ? copy.pending
            : friendlyKey(normalized);
  return <Tag color={statusColor(normalized)}>{label}</Tag>;
};

const StatusBreakdown = ({ source = {}, order = [] }) => {
  const entries = order
    .map((key) => [key, Number(source?.[key] || 0)])
    .filter(([, value]) => value > 0);
  if (!entries.length) return <span className="muted">0</span>;
  return (
    <StatusTags>
      {entries.map(([key, value]) => (
        <Tag color={statusColor(key)} key={key}>
          {friendlyKey(key)}: {value}
        </Tag>
      ))}
    </StatusTags>
  );
};

const formatDateTime = (value, isArabic) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(isArabic ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const HotelRunnerMain = ({ chosenLanguage = "English" }) => {
  const isArabic = chosenLanguage === "Arabic";
  const copy = TEXT[isArabic ? "Arabic" : "English"];
  const auth = isAuthenticated() || {};
  const userId = idOf(auth.user);
  const token = auth.token || "";
  const [adminMenuStatus, setAdminMenuStatus] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState({});
  const [mappingData, setMappingData] = useState({
    hotel: null,
    mappings: [],
    roomOptions: [],
  });
  const [draftSelections, setDraftSelections] = useState({});
  const [savingById, setSavingById] = useState({});

  const loadData = useCallback(
    async ({ signal, silent = false } = {}) => {
      if (!userId || !token) return;
      if (silent) setRefreshing(true);
      else setLoading(true);
      setLoadError("");
      try {
        const [statusResponse, mappingResponse] = await Promise.all([
          getHotelRunnerAdminStatus(userId, token, { signal }),
          getHotelRunnerRoomMappings(userId, token, { signal }),
        ]);
        setStatus(statusResponse || {});
        const nextMappings = Array.isArray(mappingResponse?.mappings)
          ? mappingResponse.mappings
          : [];
        setMappingData({
          hotel: mappingResponse?.hotel || null,
          mappings: nextMappings,
          roomOptions: Array.isArray(mappingResponse?.roomOptions)
            ? mappingResponse.roomOptions
            : [],
        });
        setDraftSelections(
          Object.fromEntries(
            nextMappings.map((mapping) => [
              idOf(mapping),
              idOf(mapping.localRoomTypeId),
            ]),
          ),
        );
      } catch (error) {
        if (error?.name !== "AbortError") {
          setLoadError(error?.message || copy.loadFailed);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [copy.loadFailed, token, userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData({ signal: controller.signal });
    if (typeof window !== "undefined" && window.innerWidth <= 1000) {
      setCollapsed(true);
    }
    return () => controller.abort();
  }, [loadData]);

  const summary = useMemo(() => summarizeHotelRunnerStatus(status), [status]);
  const roomOptions = useMemo(
    () =>
      (mappingData.roomOptions || []).map((room) => {
        const roomId = idOf(room);
        return {
          value: roomId,
          label: `${roomOptionLabel(room)} · ${copy.roomId}: ${roomId}`,
        };
      }),
    [copy.roomId, mappingData.roomOptions],
  );

  const saveMapping = async (mapping, enabled) => {
    const mappingId = idOf(mapping);
    const selectedRoomId = String(draftSelections[mappingId] || "").trim();
    if (enabled && mapping.isMaster === true) {
      message.warning(copy.masterBlocked);
      return;
    }
    if (enabled && mapping.roomListVerified !== true) {
      message.warning(copy.roomListUnverified);
      return;
    }
    if (!mappingId || (enabled && !selectedRoomId)) return;
    setSavingById((previous) => ({ ...previous, [mappingId]: true }));
    try {
      const response = await updateHotelRunnerRoomMapping(
        mappingId,
        userId,
        token,
        {
          localRoomTypeId: enabled ? selectedRoomId : "",
          enabled,
          expectedVersion: Number(mapping.version || 0),
        },
      );
      const updated = response?.mapping || {};
      setMappingData((previous) => ({
        ...previous,
        mappings: (previous.mappings || []).map((current) =>
          idOf(current) === mappingId
            ? mergeMappingUpdate(current, updated)
            : current,
        ),
      }));
      setDraftSelections((previous) => ({
        ...previous,
        [mappingId]: idOf(updated.localRoomTypeId),
      }));
      message.success(enabled ? copy.mappingSaved : copy.mappingDisabled);
      try {
        const latestStatus = await getHotelRunnerAdminStatus(userId, token);
        setStatus(latestStatus || {});
      } catch {
        // The mapping is already committed. A later manual refresh can update counters.
      }
    } catch (error) {
      if (error?.status === 409) {
        message.warning(copy.conflict);
        await loadData({ silent: true });
      } else {
        message.error(error?.message || copy.loadFailed);
      }
    } finally {
      setSavingById((previous) => ({ ...previous, [mappingId]: false }));
    }
  };

  const latestCallback = status.latestCallback || null;
  const latestProcessed = status.latestProcessed || null;
  const worker = status.worker || null;
  const hotel = mappingData.hotel || status.hotel || null;

  return (
    <PageWrapper dir={isArabic ? "rtl" : "ltr"}>
      <div className="grid-container-main">
        <div className="navcontent">
          {isArabic ? (
            <AdminNavbarArabic
              fromPage="HotelRunner"
              AdminMenuStatus={adminMenuStatus}
              setAdminMenuStatus={setAdminMenuStatus}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
            />
          ) : (
            <AdminNavbar
              fromPage="HotelRunner"
              AdminMenuStatus={adminMenuStatus}
              setAdminMenuStatus={setAdminMenuStatus}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
            />
          )}
        </div>

        <main className="otherContentWrapper">
          <PageSurface>
            <PageHeader>
              <div>
                <TitleLine>
                  <ApiOutlined />
                  <h1>{copy.title}</h1>
                </TitleLine>
                <p>{copy.subtitle}</p>
              </div>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={() => loadData({ silent: true })}
              >
                {copy.refresh}
              </Button>
            </PageHeader>

            {loadError ? (
              <Alert
                type="error"
                showIcon
                message={copy.loadFailed}
                description={loadError}
                action={
                  <Button size="small" onClick={() => loadData()}>
                    {copy.refresh}
                  </Button>
                }
              />
            ) : null}

            {loading ? (
              <LoadingPanel>
                <Spin size="large" />
              </LoadingPanel>
            ) : (
              <>
                <SummaryGrid>
                  <SummaryCard>
                    <span>{copy.configuration}</span>
                    <strong
                      className={summary.configurationReady ? "ok" : "danger"}
                    >
                      {summary.configurationReady ? (
                        <CheckCircleOutlined />
                      ) : (
                        <WarningOutlined />
                      )}
                      {summary.configurationReady
                        ? copy.configured
                        : copy.incomplete}
                    </strong>
                  </SummaryCard>
                  <SummaryCard>
                    <span>{copy.waiting}</span>
                    <strong>{summary.waiting}</strong>
                  </SummaryCard>
                  <SummaryCard $warn={summary.needsMapping > 0}>
                    <span>{copy.needsMapping}</span>
                    <strong>{summary.needsMapping}</strong>
                  </SummaryCard>
                  <SummaryCard $danger={summary.attention > 0}>
                    <span>{copy.attention}</span>
                    <strong>{summary.attention}</strong>
                  </SummaryCard>
                  <SummaryCard>
                    <span>{copy.projected}</span>
                    <strong>{summary.projected}</strong>
                  </SummaryCard>
                </SummaryGrid>

                <StatusGrid>
                  <Card title={copy.property} size="small">
                    <DetailList>
                      <li>
                        <strong>{hotel?.hotelName || "—"}</strong>
                        <code>{idOf(hotel) || "—"}</code>
                      </li>
                      <li>
                        <span>{copy.pullEnabled}</span>
                        <Tag
                          color={
                            status.configuration?.pullEnabled
                              ? "green"
                              : "default"
                          }
                        >
                          {status.configuration?.pullEnabled
                            ? copy.enabled
                            : copy.held}
                        </Tag>
                      </li>
                      <li>
                        <span>{copy.projectionEnabled}</span>
                        <Tag
                          color={
                            status.configuration?.projectionEnabled
                              ? "green"
                              : "gold"
                          }
                        >
                          {status.configuration?.projectionEnabled
                            ? copy.enabled
                            : copy.held}
                        </Tag>
                      </li>
                    </DetailList>
                  </Card>

                  <Card title={copy.queue} size="small">
                    <StatusBreakdown
                      source={status.queue}
                      order={QUEUE_ORDER}
                    />
                  </Card>

                  <Card title={copy.projections} size="small">
                    <StatusBreakdown
                      source={status.projections}
                      order={PROJECTION_ORDER}
                    />
                  </Card>

                  <Card title={copy.worker} size="small">
                    <DetailList>
                      <li>
                        <span>{copy.worker}</span>
                        <Tag color={worker?.status ? "blue" : "default"}>
                          {worker?.status
                            ? friendlyKey(worker.status)
                            : copy.never}
                        </Tag>
                      </li>
                      <li>
                        <span>{copy.callback}</span>
                        <strong>
                          {formatDateTime(
                            latestCallback?.receivedAt,
                            isArabic,
                          ) || copy.never}
                        </strong>
                      </li>
                      <li>
                        <span>{copy.processed}</span>
                        <strong>
                          {formatDateTime(
                            latestProcessed?.processedAt,
                            isArabic,
                          ) || copy.never}
                        </strong>
                      </li>
                    </DetailList>
                  </Card>
                </StatusGrid>

                <MappingCard>
                  <MappingHeader>
                    <div>
                      <h2>
                        <LinkOutlined /> {copy.roomMappings}
                      </h2>
                      <p>{copy.roomMappingHelp}</p>
                    </div>
                    <Tag color="blue">
                      {(mappingData.mappings || []).length} inv_code
                    </Tag>
                  </MappingHeader>

                  {(mappingData.mappings || []).length ? (
                    <TableScroller>
                      <table>
                        <thead>
                          <tr>
                            <th>{copy.inventoryCode}</th>
                            <th>{copy.pmsRoom}</th>
                            <th>{copy.mappingStatus}</th>
                            <th>{copy.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappingData.mappings.map((mapping) => {
                            const mappingId = idOf(mapping);
                            const selectedRoomId =
                              draftSelections[mappingId] || "";
                            const changed = mappingHasUnsavedSelection(
                              mapping,
                              selectedRoomId,
                            );
                            const canSave =
                              canActivateMapping(mapping, selectedRoomId) &&
                              Boolean(changed || mapping.status !== "active");
                            const saving = savingById[mappingId] === true;
                            return (
                              <tr key={mappingId || mapping.invCode}>
                                <td>
                                  <InventoryIdentity>
                                    <code>{mapping.invCode || "—"}</code>
                                    <strong>
                                      {mapping.externalNamePresentation ||
                                        mapping.externalName ||
                                        "—"}
                                    </strong>
                                    {mapping.isMaster ? (
                                      <Tag color="purple">Master</Tag>
                                    ) : null}
                                    {mapping.isMaster ? (
                                      <small>{copy.masterBlocked}</small>
                                    ) : null}
                                    {!mapping.isMaster &&
                                    mapping.roomListVerified !== true ? (
                                      <>
                                        <Tag color="gold">Unverified</Tag>
                                        <small>{copy.roomListUnverified}</small>
                                      </>
                                    ) : null}
                                    {(mapping.rateCodes || []).length ? (
                                      <small>
                                        {copy.rateCodes}:{" "}
                                        {mapping.rateCodes.join(", ")}
                                      </small>
                                    ) : null}
                                  </InventoryIdentity>
                                </td>
                                <td>
                                  <Select
                                    showSearch
                                    optionFilterProp="label"
                                    placeholder={copy.selectRoom}
                                    value={selectedRoomId || undefined}
                                    options={roomOptions}
                                    disabled={
                                      saving ||
                                      mapping.isMaster ||
                                      mapping.roomListVerified !== true
                                    }
                                    onChange={(value) =>
                                      setDraftSelections((previous) => ({
                                        ...previous,
                                        [mappingId]: value || "",
                                      }))
                                    }
                                    aria-label={`${copy.pmsRoom}: ${
                                      mapping.invCode || ""
                                    }`}
                                  />
                                  {selectedRoomId ? (
                                    <code>{selectedRoomId}</code>
                                  ) : null}
                                </td>
                                <td>
                                  <MappingStatusTag
                                    value={mapping.status}
                                    copy={copy}
                                  />
                                  {changed ? (
                                    <Tag color="gold">Unsaved</Tag>
                                  ) : null}
                                </td>
                                <td>
                                  <ActionRow>
                                    <Button
                                      type="primary"
                                      disabled={!canSave}
                                      loading={saving}
                                      onClick={() => saveMapping(mapping, true)}
                                    >
                                      {copy.save}
                                    </Button>
                                    {mapping.status === "active" ? (
                                      <Popconfirm
                                        title={copy.disableConfirm}
                                        onConfirm={() =>
                                          saveMapping(mapping, false)
                                        }
                                        okButtonProps={{
                                          danger: true,
                                        }}
                                      >
                                        <Button danger disabled={saving}>
                                          {copy.disable}
                                        </Button>
                                      </Popconfirm>
                                    ) : null}
                                  </ActionRow>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </TableScroller>
                  ) : (
                    <Empty description={copy.noMappings} />
                  )}
                </MappingCard>
              </>
            )}
          </PageSurface>
        </main>
      </div>
    </PageWrapper>
  );
};

export default HotelRunnerMain;

const PageWrapper = styled.div`
  min-height: calc(100vh - var(--admin-topbar-height, 0px));
  background: #f3f7fb;
`;

const PageSurface = styled.section`
  width: min(1500px, calc(100% - 28px));
  margin: 14px auto 48px;
  padding: 24px;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #d9e5ef;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(8, 36, 62, 0.08);

  @media (max-width: 760px) {
    width: calc(100% - 16px);
    padding: 16px;
    margin-top: 64px;
  }
`;

const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;

  p {
    max-width: 780px;
    margin: 8px 0 0;
    color: #557086;
    line-height: 1.55;
  }

  @media (max-width: 700px) {
    flex-direction: column;
  }
`;

const TitleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f5f92;

  h1 {
    margin: 0;
    font-size: clamp(1.45rem, 2vw, 2rem);
    color: #102d48;
  }

  .anticon {
    font-size: 1.55rem;
  }
`;

const LoadingPanel = styled.div`
  min-height: 360px;
  display: grid;
  place-items: center;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 12px;
  margin: 18px 0;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div`
  min-height: 92px;
  padding: 15px;
  border: 1px solid
    ${(props) =>
      props.$danger ? "#ffc4c4" : props.$warn ? "#ffe1a8" : "#dce8f1"};
  border-radius: 12px;
  background: ${(props) =>
    props.$danger ? "#fff7f7" : props.$warn ? "#fffaf0" : "#f8fbfd"};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;

  span {
    font-size: 0.82rem;
    font-weight: 700;
    color: #587188;
  }

  strong {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 1.45rem;
    color: #173b5b;
  }

  strong.ok {
    font-size: 0.96rem;
    color: #17844a;
  }

  strong.danger {
    font-size: 0.96rem;
    color: #bd2f35;
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;

  .ant-card {
    border-color: #dce7ef;
  }

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

const StatusTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  .ant-tag {
    margin: 0;
  }

  .muted {
    color: #7d8e9b;
  }
`;

const DetailList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  li:first-child {
    align-items: flex-start;
    flex-direction: column;
  }

  span {
    color: #61788b;
  }

  strong,
  code {
    overflow-wrap: anywhere;
  }

  code {
    color: #516b7e;
    font-size: 0.76rem;
  }
`;

const MappingCard = styled.section`
  border: 1px solid #d7e4ee;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
`;

const MappingHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #eef8ff, #f8fbfd);
  border-bottom: 1px solid #d7e4ee;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #123c5c;
  }

  p {
    max-width: 900px;
    margin: 7px 0 0;
    color: #526f84;
    line-height: 1.5;
  }
`;

const TableScroller = styled.div`
  overflow-x: auto;

  table {
    width: 100%;
    min-width: 950px;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 14px 16px;
    text-align: start;
    vertical-align: top;
    border-bottom: 1px solid #e4edf3;
  }

  th {
    background: #f7fafc;
    color: #38566d;
    font-size: 0.79rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  td:nth-child(1) {
    width: 25%;
  }

  td:nth-child(2) {
    width: 42%;
  }

  td:nth-child(2) .ant-select {
    width: 100%;
    min-width: 300px;
  }

  td:nth-child(2) > code {
    display: block;
    margin-top: 7px;
    font-size: 0.72rem;
    color: #667f92;
    overflow-wrap: anywhere;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`;

const InventoryIdentity = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  code {
    display: inline-flex;
    padding: 4px 7px;
    border-radius: 6px;
    background: #e9f3fa;
    color: #0c527f;
    font-weight: 800;
  }

  strong,
  small {
    flex-basis: 100%;
  }

  small {
    color: #718697;
  }
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
