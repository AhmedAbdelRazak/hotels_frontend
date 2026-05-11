import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AdminNavbarArabic from "../AdminNavbar/AdminNavbarArabic";
import styled, { createGlobalStyle } from "styled-components";
import { Button, Modal, Switch, Tag } from "antd";
// import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import ZSignupForm from "./ZSignupForm";
import { defaultUserValues } from "../../AdminModule/NewHotels/Assets";
import { toast } from "react-toastify";
import {
	getHotelStaffUsers,
	isAuthenticated,
	signupHotelStaff,
	updateHotelStaffUser,
} from "../../auth";
import { getHotelDetails, getHotelById, hotelAccount } from "../apiAdmin";
import { getStoredMenuCollapsed } from "../utils/menuState";

const roleOptions = [
	{
		value: "hotelmanager",
		role: 2000,
		en: "Hotel Manager",
		ar: "\u0645\u062f\u064a\u0631 \u0627\u0644\u0641\u0646\u062f\u0642",
	},
	{
		value: "reception",
		role: 3000,
		en: "Reception",
		ar: "\u0627\u0644\u0627\u0633\u062a\u0642\u0628\u0627\u0644",
	},
	{
		value: "ordertaker",
		role: 7000,
		en: "External Agent / Order Taker",
		ar: "\u0648\u0643\u064a\u0644 \u062e\u0627\u0631\u062c\u064a / \u0645\u0633\u062a\u0644\u0645 \u062d\u062c\u0648\u0632\u0627\u062a",
	},
	{
		value: "finance",
		role: 6000,
		en: "Finance",
		ar: "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
	},
	{
		value: "reservationemployee",
		role: 8000,
		en: "Reservations Officer",
		ar: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
	},
	{
		value: "housekeepingmanager",
		role: 4000,
		en: "Housekeeping Manager",
		ar: "\u0645\u062f\u064a\u0631 \u0627\u0644\u0646\u0638\u0627\u0641\u0629",
	},
	{
		value: "housekeeping",
		role: 5000,
		en: "Housekeeping Staff",
		ar: "\u0637\u0627\u0642\u0645 \u0627\u0644\u0646\u0638\u0627\u0641\u0629",
	},
];

const getRoleOption = (roleDescription, role) =>
	roleOptions.find((option) => option.value === roleDescription) ||
	roleOptions.find((option) => option.role === Number(role)) ||
	roleOptions[0];

const getDefaultAccessForRole = (roleDescription) => {
	if (roleDescription === "hotelmanager") {
		return [
			"dashboard",
			"reservations",
			"newReservation",
			"reports",
			"finance",
			"housekeeping",
			"settings",
		];
	}
	if (roleDescription === "reception") return ["reservations", "newReservation"];
	if (roleDescription === "ordertaker")
		return ["newReservation", "ownReservations"];
	if (roleDescription === "finance") return ["dashboard", "finance", "reports"];
	if (roleDescription === "reservationemployee")
		return ["reservations", "newReservation", "settings"];
	if (roleDescription === "housekeepingmanager")
		return ["dashboard", "housekeeping"];
	if (roleDescription === "housekeeping") return ["housekeeping"];
	return [];
};

const isPlaceholderStaffEmail = (email) =>
	String(email || "").toLowerCase().endsWith("@staff.jannatbooking.local");

const visibleStaffEmail = (staff, emptyLabel) =>
	staff?.emailIsPlaceholder || isPlaceholderStaffEmail(staff?.email)
		? emptyLabel
		: staff?.email || emptyLabel;

const SignupNew = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [values, setValues] = useState(defaultUserValues);
	const { value: initialCollapsed, hasStored: hasStoredCollapsed } =
		getStoredMenuCollapsed();
	const [collapsed, setCollapsed] = useState(initialCollapsed);
	const [roleDescription, setRoleDescription] = useState("");
	const [hotelDetails, setHotelDetails] = useState("");
	const [staffList, setStaffList] = useState([]);
	const [staffLoading, setStaffLoading] = useState(false);
	const [staffSaving, setStaffSaving] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingStaff, setEditingStaff] = useState(null);
	const [editValues, setEditValues] = useState({
		name: "",
		email: "",
		phone: "",
		roleDescription: "reception",
		password: "",
		activeUser: true,
	});
	const { userId: routeUserId, hotelId } = useParams();

	const { languageToggle, chosenLanguage } = useCartContext();

	const { user, token } = isAuthenticated();
	const text = useMemo(
		() =>
			chosenLanguage === "Arabic"
				? {
						pageTitle:
							"\u0625\u062f\u0627\u0631\u0629 \u0637\u0627\u0642\u0645 \u0627\u0644\u0641\u0646\u062f\u0642",
						pageSubtitle:
							"\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629 \u062a\u062f\u064a\u0631 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642 \u0641\u0642\u0637.",
						createTitle:
							"\u0625\u0646\u0634\u0627\u0621 \u0645\u0633\u062a\u062e\u062f\u0645 \u062c\u062f\u064a\u062f",
						listTitle:
							"\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646 \u0627\u0644\u062d\u0627\u0644\u064a\u0648\u0646",
						active: "\u0646\u0634\u0637",
						inactive: "\u0645\u0639\u0637\u0644",
						edit: "\u062a\u0639\u062f\u064a\u0644",
						deactivate: "\u062a\u0639\u0637\u064a\u0644",
						activate: "\u062a\u0641\u0639\u064a\u0644",
						noStaff:
							"\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0648\u0638\u0641\u0648\u0646 \u0644\u0647\u0630\u0627 \u0627\u0644\u0641\u0646\u062f\u0642 \u062d\u062a\u0649 \u0627\u0644\u0622\u0646.",
						editTitle:
							"\u062a\u0639\u062f\u064a\u0644 \u062d\u0633\u0627\u0628 \u0645\u0648\u0638\u0641",
						name: "\u0627\u0644\u0627\u0633\u0645",
						email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)",
						noEmail: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0628\u0631\u064a\u062f",
						phone: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641 (\u0645\u0637\u0644\u0648\u0628)",
						role: "\u0627\u0644\u062f\u0648\u0631",
						password:
							"\u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u062c\u062f\u064a\u062f\u0629",
						passwordHint:
							"\u0627\u062a\u0631\u0643\u0647\u0627 \u0641\u0627\u0631\u063a\u0629 \u0625\u0630\u0627 \u0644\u0627 \u062a\u0631\u064a\u062f \u062a\u063a\u064a\u064a\u0631\u0647\u0627",
						save: "\u062d\u0641\u0638",
						cancel: "\u0625\u0644\u063a\u0627\u0621",
				  }
				: {
						pageTitle: "Hotel Staff Management",
						pageSubtitle:
							"This page manages access for this hotel only, even when the owner has multiple properties.",
						createTitle: "Create New User",
						listTitle: "Current Staff",
						active: "Active",
						inactive: "Inactive",
						edit: "Edit",
						deactivate: "Deactivate",
						activate: "Activate",
						noStaff: "No staff accounts have been created for this hotel yet.",
						editTitle: "Edit Staff Account",
						name: "Name",
						email: "Email (Optional)",
						noEmail: "No email",
						phone: "Phone (Required)",
						role: "Role",
						password: "New Password",
						passwordHint: "Leave blank to keep the current password",
						save: "Save",
						cancel: "Cancel",
				  },
		[chosenLanguage]
	);

	const targetHotelId = hotelDetails?._id || hotelId || "";
	const targetOwnerId =
		hotelDetails?.belongsTo?._id ||
		hotelDetails?.belongsTo ||
		routeUserId ||
		user?.belongsToId ||
		user?._id ||
		"";
	useEffect(() => {
		if (!hasStoredCollapsed && window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, [hasStoredCollapsed]);

	const gettingHotelData = () => {
		if (hotelId) {
			getHotelById(hotelId).then((data2) => {
				if (data2 && data2.error) {
					console.log(data2.error, "Error rendering");
				} else if (data2 && data2._id) {
					setHotelDetails(data2);
				}
			});
			return;
		}

		hotelAccount(user._id, token, user._id).then((data) => {
			if (data && data.error) {
				console.log("This is erroring");
				console.log(data.error, "Error rendering");
			} else {
				getHotelDetails(data._id).then((data2) => {
					if (data2 && data2.error) {
						console.log(data2.error, "Error rendering");
					} else {
						if (data && data.name && data._id && data2 && data2.length > 0) {
							setHotelDetails(data2[0]);
						}
					}
				});
			}
		});
	};

	const fetchStaffList = useCallback(() => {
		if (!targetHotelId || !user?._id || !token) return;
		setStaffLoading(true);
		getHotelStaffUsers(user._id, token, targetHotelId)
			.then((data) => {
				if (data && data.error) {
					toast.error(data.error);
					setStaffList([]);
				} else {
					setStaffList(Array.isArray(data) ? data : []);
				}
			})
			.finally(() => setStaffLoading(false));
	}, [targetHotelId, token, user?._id]);

	useEffect(() => {
		gettingHotelData();
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		fetchStaffList();
	}, [fetchStaffList]);

	const handleChange = (name) => (event) => {
		setValues({
			...values,
			error: false,
			misMatch: false,
			[name]: event.target.value,
		});
	};

	const clickSubmit = (event) => {
		event.preventDefault();
		if (values.password !== values.password2) {
			setValues({
				...values,
				success: false,
				misMatch: true,
			});
			return <>{toast.error("Error! Passwords are not matching")}</>;
		} else {
			if (!roleDescription) {
				toast.error("Please select a department / role for this user");
				return;
			}
			if (!targetHotelId || !targetOwnerId) {
				toast.error("Hotel context is missing. Please reopen this hotel page.");
				return;
			}
			const trimmedName = String(values.name || "").trim();
			const trimmedEmail = String(values.email || "").trim();
			const trimmedPhone = String(values.phone || "").trim();
			if (!trimmedName || !trimmedPhone || !values.password || !values.password2) {
				toast.error(
					chosenLanguage === "Arabic"
						? "الاسم ورقم الهاتف وكلمة المرور مطلوبة"
						: "Name, phone, and password are required"
				);
				return;
			}
			if (
				trimmedEmail &&
				!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
			) {
				toast.error(
					chosenLanguage === "Arabic"
						? "صيغة البريد الإلكتروني غير صحيحة"
						: "Email format is invalid"
				);
				return;
			}
			setValues({ ...values, error: false, misMatch: false });
			const selectedRole = getRoleOption(roleDescription);
			signupHotelStaff(user._id, token, {
				name: trimmedName,
				email: trimmedEmail,
				password: values.password,
				password2: values.password2,
				misMatch: values.misMatch,
				role: selectedRole.role,
				roleDescription: selectedRole.value,
				roles: [selectedRole.role],
				roleDescriptions: [selectedRole.value],
				accessTo: getDefaultAccessForRole(selectedRole.value),
				phone: trimmedPhone,
				hotelName:
					hotelDetails.hotelName || hotelDetails.belongsTo?.hotelName || "",
				hotelAddress:
					hotelDetails.hotelAddress ||
					hotelDetails.belongsTo?.hotelAddress ||
					"",
				hotelCountry:
					hotelDetails.hotelCountry ||
					hotelDetails.belongsTo?.hotelCountry ||
					"",
				hotelState:
					hotelDetails.hotelState || hotelDetails.belongsTo?.hotelState || "",
				hotelCity:
					hotelDetails.hotelCity || hotelDetails.belongsTo?.hotelCity || "",
				hotelIdWork: targetHotelId, // Keep this staff user scoped to one hotel only.
				hotelIdsWork: [targetHotelId],
				hotelsToSupport: [targetHotelId],
				belongsToId: targetOwnerId,
			}).then((data) => {
				if (data.error || data.misMatch) {
					setValues({ ...values, error: data.error, success: false });
					toast.error(data.error);
				} else {
					toast.success("Account was successfully created!");
					setValues(defaultUserValues);
					setRoleDescription("");
					fetchStaffList();
				}
			});
		}
	};

	const openEditStaff = (staff) => {
		const option = getRoleOption(staff.roleDescription, staff.role);
		setEditingStaff(staff);
		setEditValues({
			name: staff.name || "",
			email:
				staff.emailIsPlaceholder || isPlaceholderStaffEmail(staff.email)
					? ""
					: staff.email || "",
			phone: staff.phone || "",
			roleDescription: option.value,
			password: "",
			activeUser: staff.activeUser !== false,
		});
		setEditModalOpen(true);
	};

	const saveStaffChanges = () => {
		if (!editingStaff?._id || !targetHotelId) return;
		const trimmedName = String(editValues.name || "").trim();
		const trimmedEmail = String(editValues.email || "").trim();
		const trimmedPhone = String(editValues.phone || "").trim();
		if (!trimmedName || !trimmedPhone) {
			toast.error(
				chosenLanguage === "Arabic"
					? "الاسم ورقم الهاتف مطلوبان"
					: "Name and phone are required"
			);
			return;
		}
		if (
			trimmedEmail &&
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
		) {
			toast.error(
				chosenLanguage === "Arabic"
					? "صيغة البريد الإلكتروني غير صحيحة"
					: "Email format is invalid"
			);
			return;
		}
		const option = getRoleOption(editValues.roleDescription);
		const currentRole = getRoleOption(
			editingStaff.roleDescription,
			editingStaff.role
		);
		const roleChanged = currentRole.value !== option.value;
		const currentAccess = Array.isArray(editingStaff.accessTo)
			? editingStaff.accessTo
			: [];
		setStaffSaving(true);
		updateHotelStaffUser(user._id, token, targetHotelId, editingStaff._id, {
			name: trimmedName,
			email: trimmedEmail,
			phone: trimmedPhone,
			role: option.role,
			roleDescription: option.value,
			roles: [option.role],
			roleDescriptions: [option.value],
			accessTo:
				roleChanged || currentAccess.length === 0
					? getDefaultAccessForRole(option.value)
					: currentAccess,
			password: editValues.password,
			activeUser: editValues.activeUser,
		})
			.then((data) => {
				if (data && data.error) {
					toast.error(data.error);
					return;
				}
				toast.success("Staff account updated successfully");
				setEditModalOpen(false);
				setEditingStaff(null);
				fetchStaffList();
			})
			.finally(() => setStaffSaving(false));
	};

	const toggleActiveStaff = (staff) => {
		const nextActive = staff.activeUser === false;
		const confirmMessage =
			chosenLanguage === "Arabic"
				? nextActive
					? "\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0641\u0639\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0638\u0641\u061f"
					: "\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0639\u0637\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0638\u0641\u061f"
				: nextActive
				  ? "Reactivate this staff account?"
				  : "Deactivate this staff account?";
		if (!window.confirm(confirmMessage)) return;
		updateHotelStaffUser(user._id, token, targetHotelId, staff._id, {
			activeUser: nextActive,
		}).then((data) => {
			if (data && data.error) {
				toast.error(data.error);
				return;
			}
			toast.success("Staff account updated successfully");
			fetchStaffList();
		});
	};

	return (
		<SignupNewWrapper
			dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			$show={collapsed}
		>
			<StaffGlobalStyles />
			<div className='grid-container-main'>
				<div className='navcontent'>
					{chosenLanguage === "Arabic" ? (
						<AdminNavbarArabic
							fromPage='HotelStaff'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					) : (
						<AdminNavbar
							fromPage='HotelStaff'
							AdminMenuStatus={AdminMenuStatus}
							setAdminMenuStatus={setAdminMenuStatus}
							collapsed={collapsed}
							setCollapsed={setCollapsed}
							chosenLanguage={chosenLanguage}
						/>
					)}
				</div>

				<div className='otherContentWrapper'>
					<div
						style={{
							textAlign: chosenLanguage === "Arabic" ? "left" : "right",
							fontWeight: "bold",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						onClick={() => {
							if (chosenLanguage === "English") {
								languageToggle("Arabic");
							} else {
								languageToggle("English");
							}
						}}
					>
						{chosenLanguage === "English" ? "ARABIC" : "English"}
					</div>

					<div className='container-wrapper'>
						<div className='staff-hero'>
							<div>
								<h1>{text.pageTitle}</h1>
								<p>{text.pageSubtitle}</p>
							</div>
							<div className='hotel-chip'>
								{hotelDetails?.hotelName ||
									(chosenLanguage === "Arabic" ? "هذا الفندق" : "This hotel")}
							</div>
						</div>
						{chosenLanguage === "Arabic" ? (
							<h1>مرحبًا، يرجى التأكد من عدم إعطاء كلمة مرور الحساب لموظفيك</h1>
						) : (
							<h1>
								Hi There, Please ensure not to give this password to any of your
								staff
							</h1>
						)}
						<div className='py-3'>
							<ZSignupForm
								chosenLanguage={chosenLanguage}
								values={values}
								clickSubmit={clickSubmit}
								handleChange={handleChange}
								roleDescription={roleDescription}
								setRoleDescription={setRoleDescription}
							/>
						</div>

						<StaffPanel>
							<div className='staff-list-head'>
								<div>
									<h2>{text.listTitle}</h2>
									<p>
										{staffList.length}{" "}
										{chosenLanguage === "Arabic"
											? "\u0645\u0633\u062a\u062e\u062f\u0645"
											: "users"}{" "}
										- {hotelDetails?.hotelName || ""}
									</p>
								</div>
								<Button onClick={fetchStaffList} loading={staffLoading}>
									{chosenLanguage === "Arabic"
										? "\u062a\u062d\u062f\u064a\u062b"
										: "Refresh"}
								</Button>
							</div>

							{staffLoading ? (
								<div className='empty-state'>Loading...</div>
							) : staffList.length === 0 ? (
								<div className='empty-state'>{text.noStaff}</div>
							) : (
								<div className='staff-grid'>
									{staffList.map((staff) => {
										const role = getRoleOption(
											staff.roleDescription,
											staff.role
										);
										return (
											<div className='staff-card' key={staff._id}>
												<div className='staff-card-top'>
													<div>
														<h3>{staff.name}</h3>
														<p>{chosenLanguage === "Arabic" ? role.ar : role.en}</p>
													</div>
													<Tag color={staff.activeUser === false ? "red" : "green"}>
														{staff.activeUser === false
															? text.inactive
															: text.active}
													</Tag>
												</div>
												<div className='staff-meta'>
													<span
														dir={
															staff.emailIsPlaceholder ||
															isPlaceholderStaffEmail(staff.email)
																? "auto"
																: "ltr"
														}
													>
														{visibleStaffEmail(staff, text.noEmail)}
													</span>
													<span dir='ltr'>{staff.phone}</span>
												</div>
												<div className='staff-actions'>
													<Button type='primary' onClick={() => openEditStaff(staff)}>
														{text.edit}
													</Button>
													<Button
														danger={staff.activeUser !== false}
														onClick={() => toggleActiveStaff(staff)}
													>
														{staff.activeUser === false
															? text.activate
															: text.deactivate}
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</StaffPanel>
					</div>
				</div>
			</div>

			<Modal
				className={`staff-management-modal ${
					chosenLanguage === "Arabic" ? "is-arabic" : ""
				}`}
				title={text.editTitle}
				open={editModalOpen}
				onCancel={() => setEditModalOpen(false)}
				footer={[
					<Button key='cancel' onClick={() => setEditModalOpen(false)}>
						{text.cancel}
					</Button>,
					<Button
						key='save'
						type='primary'
						loading={staffSaving}
						onClick={saveStaffChanges}
					>
						{text.save}
					</Button>,
				]}
				destroyOnClose
			>
				<div className='staff-edit-form'>
					<label>{text.name}</label>
					<input
						value={editValues.name}
						onChange={(e) =>
							setEditValues({ ...editValues, name: e.target.value })
						}
					/>
					<label>{text.email}</label>
					<input
						value={editValues.email}
						onChange={(e) =>
							setEditValues({ ...editValues, email: e.target.value })
						}
					/>
					<label>{text.phone}</label>
					<input
						value={editValues.phone}
						onChange={(e) =>
							setEditValues({ ...editValues, phone: e.target.value })
						}
					/>
					<label>{text.role}</label>
					<select
						value={editValues.roleDescription}
						onChange={(e) =>
							setEditValues({
								...editValues,
								roleDescription: e.target.value,
							})
						}
					>
						{roleOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{chosenLanguage === "Arabic" ? option.ar : option.en}
							</option>
						))}
					</select>
					<label>{text.password}</label>
					<input
						type='password'
						placeholder={text.passwordHint}
						value={editValues.password}
						onChange={(e) =>
							setEditValues({ ...editValues, password: e.target.value })
						}
					/>
					<div className='staff-active-row'>
						<span>{editValues.activeUser ? text.active : text.inactive}</span>
						<Switch
							checked={editValues.activeUser}
							onChange={(checked) =>
								setEditValues({ ...editValues, activeUser: checked })
							}
						/>
					</div>
				</div>
			</Modal>
		</SignupNewWrapper>
	);
};

export default SignupNew;

const SignupNewWrapper = styled.div`
	overflow-x: hidden;
	background: #f5f8fc;
	margin-top: 46px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.$show ? "72px minmax(0, 1fr)" : "280px minmax(0, 1fr)"};
		gap: 0;
	}

	.otherContentWrapper {
		min-width: 0;
		padding: 16px;
	}

	.container-wrapper {
		border: 1px solid #cfe5fb;
		padding: 18px;
		border-radius: 14px;
		background: #ffffff;
		margin: 0 auto;
		max-width: 1320px;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
	}

	.container-wrapper > h1 {
		display: none;
	}

	h1 {
		font-size: clamp(1.35rem, 2vw, 1.8rem);
		font-weight: bold;
		text-align: start;
		color: #172033;
		margin: 0;
	}

	h2 {
		font-size: 1.15rem;
		font-weight: 900;
		color: #172033;
		margin: 16px 0 8px;
	}

	.staff-hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px;
		border: 1px solid #b8dcff;
		border-radius: 12px;
		background: linear-gradient(135deg, #e4f3ff, #f8fcff);
	}

	.staff-hero p {
		margin: 6px 0 0;
		color: #546179;
		font-weight: 700;
	}

	.hotel-chip {
		flex: 0 0 auto;
		padding: 10px 14px;
		border-radius: 10px;
		background: #172033;
		color: #ffffff;
		font-weight: 900;
		text-transform: capitalize;
	}

	.create-panel {
		border: 1px solid #d9e9fb;
		border-radius: 12px;
		background: #f8fbff;
		padding: 10px 14px !important;
	}

	@media (max-width: 1000px) {
		margin-top: 62px;

		.grid-container-main {
			grid-template-columns: 1fr;
		}

		.otherContentWrapper {
			padding: 8px;
		}

		.container-wrapper {
			padding: 10px;
			border-radius: 10px;
		}

		.staff-hero {
			align-items: stretch;
			flex-direction: column;
		}

		.hotel-chip {
			width: 100%;
			text-align: center;
		}
	}

	@media (max-width: 1400px) {
		background: #f5f8fc;
	}
`;

const StaffPanel = styled.div`
	margin-top: 18px;
	padding: 14px;
	border: 1px solid #b8dcff;
	border-top: 4px solid #1476ef;
	border-radius: 14px;
	background: #eef7ff;

	.staff-list-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	.staff-list-head p {
		color: #64748b;
		font-weight: 700;
	}

	.staff-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		gap: 12px;
	}

	.staff-card {
		padding: 12px;
		border: 1px solid #d6e6f6;
		border-radius: 12px;
		background: #ffffff;
		box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
	}

	.staff-card-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 10px;
	}

	.staff-card h3 {
		color: #172033;
		font-size: 1rem;
		font-weight: 900;
	}

	.staff-card p {
		color: #1476ef;
		font-size: 0.86rem;
		font-weight: 800;
		margin-top: 3px;
	}

	.staff-meta {
		display: grid;
		gap: 6px;
		margin: 12px 0;
		color: #334155;
		font-weight: 700;
		overflow-wrap: anywhere;
	}

	.staff-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.empty-state {
		padding: 18px;
		border: 1px dashed #9dc9f5;
		border-radius: 12px;
		background: #ffffff;
		text-align: center;
		color: #64748b;
		font-weight: 800;
	}

	@media (max-width: 640px) {
		padding: 10px;

		.staff-list-head {
			align-items: stretch;
			flex-direction: column;
		}
	}
`;

const StaffGlobalStyles = createGlobalStyle`
	.staff-management-modal .ant-modal-content {
		border-radius: 14px;
		overflow: hidden;
	}

	.staff-management-modal .ant-modal-header {
		background: #e4f3ff;
		border-bottom: 1px solid #b8dcff;
	}

	.staff-management-modal.is-arabic .ant-modal-content,
	.staff-management-modal.is-arabic .ant-modal-title {
		direction: rtl;
		text-align: right;
	}

	.staff-edit-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px 12px;
	}

	.staff-edit-form label {
		color: #26364a;
		font-weight: 900;
		margin-bottom: -4px;
	}

	.staff-edit-form input,
	.staff-edit-form select {
		width: 100%;
		min-height: 40px;
		border: 1px solid #d6e3f3;
		border-radius: 8px;
		padding: 0 10px;
	}

	.staff-active-row {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px;
		border: 1px solid #d6e3f3;
		border-radius: 10px;
		background: #f8fbff;
		font-weight: 900;
	}

	@media (max-width: 640px) {
		.staff-edit-form {
			grid-template-columns: 1fr;
		}
	}
`;
