import React from "react";
import styled from "styled-components";

const roleOptions = [
	{
		value: "reception",
		en: "Reception",
		ar: "موظف الاستقبال",
	},
	{
		value: "ordertaker",
		en: "External Agent / Order Taker",
		ar: "\u0648\u0643\u064a\u0644 \u062e\u0627\u0631\u062c\u064a / \u0645\u0633\u062a\u0644\u0645 \u062d\u062c\u0648\u0632\u0627\u062a",
	},
	{
		value: "reservationemployee",
		en: "Reservations Officer",
		ar: "\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a",
	},
	{
		value: "housekeepingmanager",
		en: "Housekeeping Manager",
		ar: "مدير النظافة",
	},
	{
		value: "housekeeping",
		en: "Housekeeping Staff",
		ar: "طاقم النظافة",
	},
	{
		value: "hotelmanager",
		en: "Hotel Manager",
		ar: "مدير الفندق",
	},
	{
		value: "finance",
		en: "Finance",
		ar: "المالية",
	},
];

const copy = {
	Arabic: {
		name: "اسم الموظف",
		email: "البريد الإلكتروني",
		emailHint: "اختياري، ويمكن للموظف تسجيل الدخول برقم الهاتف.",
		phone: "رقم الهاتف",
		role: "القسم",
		password: "كلمة المرور",
		password2: "تأكيد كلمة المرور",
		required: "مطلوب",
		optional: "اختياري",
		selectRole: "اختر القسم",
		submit: "تسجيل الموظف",
	},
	English: {
		name: "Staff Name",
		email: "Email Address",
		emailHint: "Optional. The staff member can sign in with their phone number.",
		phone: "Phone Number",
		role: "Department",
		password: "Password",
		password2: "Confirm Password",
		required: "Required",
		optional: "Optional",
		selectRole: "Select department",
		submit: "Register Staff",
	},
};

const FieldLabel = ({ children, required, optional, labels }) => (
	<label>
		<span>{children}</span>
		<small className={required ? "required" : "optional"}>
			{required ? labels.required : optional ? labels.optional : ""}
		</small>
	</label>
);

const ZSignupForm = ({
	chosenLanguage,
	clickSubmit,
	handleChange,
	values,
	roleDescription,
	setRoleDescription,
}) => {
	const isArabic = chosenLanguage === "Arabic";
	const labels = isArabic ? copy.Arabic : copy.English;

	return (
		<ZSignupFormWrapper $isArabic={isArabic}>
			<form onSubmit={clickSubmit} className='staff-create-form'>
				<div className='staff-field'>
					<FieldLabel required labels={labels}>
						{labels.name}
					</FieldLabel>
					<input
						type='text'
						name='name'
						value={values?.name || ""}
						onChange={handleChange("name")}
						required
					/>
				</div>

				<div className='staff-field'>
					<FieldLabel optional labels={labels}>
						{labels.email}
					</FieldLabel>
					<input
						type='email'
						name='email'
						value={values?.email || ""}
						onChange={handleChange("email")}
					/>
					<p className='field-help'>{labels.emailHint}</p>
				</div>

				<div className='staff-field'>
					<FieldLabel required labels={labels}>
						{labels.phone}
					</FieldLabel>
					<input
						type='tel'
						name='phone'
						value={values?.phone || ""}
						onChange={handleChange("phone")}
						required
					/>
				</div>

				<div className='staff-field'>
					<FieldLabel required labels={labels}>
						{labels.role}
					</FieldLabel>
					<select
						value={roleDescription || ""}
						onChange={(e) => setRoleDescription(e.target.value)}
						required
					>
						<option value=''>{labels.selectRole}</option>
						{roleOptions.map((option) => (
							<option value={option.value} key={option.value}>
								{isArabic ? option.ar : option.en}
							</option>
						))}
					</select>
				</div>

				<div className='staff-field'>
					<FieldLabel required labels={labels}>
						{labels.password}
					</FieldLabel>
					<input
						type='password'
						name='password'
						value={values?.password || ""}
						onChange={handleChange("password")}
						required
					/>
				</div>

				<div className='staff-field'>
					<FieldLabel required labels={labels}>
						{labels.password2}
					</FieldLabel>
					<input
						type='password'
						name='password2'
						value={values?.password2 || ""}
						onChange={handleChange("password2")}
						required
					/>
				</div>

				<button type='submit' className='staff-submit'>
					{labels.submit}
				</button>
			</form>
		</ZSignupFormWrapper>
	);
};

export default ZSignupForm;

const ZSignupFormWrapper = styled.div`
	direction: ${(props) => (props.$isArabic ? "rtl" : "ltr")};
	text-align: ${(props) => (props.$isArabic ? "right" : "left")};

	.staff-create-form {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px 18px;
		padding: 18px;
		border: 1px solid #cfe5fb;
		border-radius: 14px;
		background: linear-gradient(135deg, #f8fbff, #eef7ff);
	}

	.staff-field {
		min-width: 0;
	}

	label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 6px;
		color: #172033;
		font-weight: 900;
	}

	label small {
		flex: 0 0 auto;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 900;
	}

	label small.required {
		color: #b42318;
		background: #fff1f0;
		border: 1px solid #ffccc7;
	}

	label small.optional {
		color: #075985;
		background: #e0f2fe;
		border: 1px solid #bae6fd;
	}

	input,
	select {
		display: block;
		width: 100%;
		min-height: 44px;
		padding: 0 12px;
		font-size: 1rem;
		border: 1px solid #bfd8f2;
		border-radius: 10px;
		background: #ffffff;
		color: #172033;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: #1476ef;
		box-shadow: 0 0 0 3px rgba(20, 118, 239, 0.14);
	}

	.field-help {
		margin: 6px 0 0;
		color: #52657d;
		font-size: 0.78rem;
		font-weight: 700;
		line-height: 1.45;
	}

	.staff-submit {
		grid-column: 1 / -1;
		justify-self: center;
		width: min(100%, 420px);
		min-height: 46px;
		border: 0;
		border-radius: 10px;
		background: linear-gradient(135deg, #0f6fe8, #1684f7);
		color: #ffffff;
		font-weight: 900;
		letter-spacing: 0;
		box-shadow: 0 10px 20px rgba(20, 118, 239, 0.2);
	}

	.staff-submit:hover {
		background: linear-gradient(135deg, #0c5fc8, #1476ef);
	}

	@media (max-width: 1050px) {
		.staff-create-form {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 620px) {
		.staff-create-form {
			grid-template-columns: 1fr;
			gap: 12px;
			padding: 12px;
		}
	}
`;
