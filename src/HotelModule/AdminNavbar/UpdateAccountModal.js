/** @format */

import React, { useEffect } from "react";
import { Modal, Form, Input, message } from "antd";
import axios from "axios";
import { UserOutlined, MailOutlined, LockOutlined } from "@ant-design/icons";

function updateLocalUserFields(patch) {
	try {
		const raw = localStorage.getItem("jwt");
		if (!raw) return;
		const data = JSON.parse(raw);
		if (data?.user) {
			data.user = { ...data.user, ...patch };
			localStorage.setItem("jwt", JSON.stringify(data));
		}
	} catch {}
}

const emailRule = [
	{ required: true, message: "Please enter your email" },
	{ type: "email", message: "Invalid email address" },
];

const UpdateAccountModal = ({
	open,
	onClose,
	token,
	targetUser, // { _id, name, email }
	actingUser, // { _id, role }
	mode = "self", // "self" | "admin" (we'll use "self" in TopNavbar for non-admins)
	onUpdated, // optional callback after success
}) => {
	const [form] = Form.useForm();
	const initial = {
		name: targetUser?.name || "",
		email: targetUser?.email || "",
		password: "",
		password2: "",
	};

	useEffect(() => {
		if (open) form.setFieldsValue(initial);
	}, [open]); // eslint-disable-line

	const handleSubmit = async (values) => {
		const { name, email, password, password2 } = values;

		if (password || password2) {
			if (password !== password2) {
				return message.error("Passwords do not match");
			}
			if (password.length < 6) {
				return message.error("Password should be min 6 characters long");
			}
		}

		// send only changed fields
		const patch = {};
		if (name && name !== targetUser?.name) patch.name = name;
		if (email && email !== targetUser?.email) patch.email = email;
		if (password) patch.password = password;

		if (Object.keys(patch).length === 0) {
			message.info("Nothing to update");
			onClose?.();
			return;
		}

		try {
			const headers = {
				Accept: "application/json",
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			};

			let url = "";
			if (mode === "self" || actingUser?._id === targetUser?._id) {
				// self-update
				url = `${process.env.REACT_APP_API_URL}/user/${targetUser._id}`;
			} else {
				// admin updating someone else (kept for completeness)
				url = `${process.env.REACT_APP_API_URL}/user/${targetUser._id}/${actingUser._id}`;
			}

			const { data } = await axios.put(url, patch, { headers });

			// keep UI fresh
			updateLocalUserFields({
				name: data?.name ?? patch.name,
				email: data?.email ?? patch.email,
			});

			message.success("Account updated");
			onUpdated?.(data);
			onClose?.();
			form.resetFields();
		} catch (err) {
			const apiMsg =
				err?.response?.data?.error ||
				err?.response?.data?.message ||
				err?.message ||
				"Update failed";
			message.error(apiMsg);
		}
	};

	return (
		<Modal
			title='Update Account'
			open={open}
			onOk={() => form.submit()}
			onCancel={onClose}
			okText='Update'
			cancelText='Cancel'
			destroyOnClose
			maskClosable={false}
		>
			<Form
				form={form}
				layout='vertical'
				onFinish={handleSubmit}
				initialValues={initial}
			>
				<Form.Item
					name='name'
					label='User Name (Manager / Owner / Agent)'
					rules={[{ required: true, message: "Please enter your name" }]}
				>
					<Input prefix={<UserOutlined />} placeholder='Full Name' />
				</Form.Item>

				<Form.Item name='email' label='Email Address' rules={emailRule}>
					<Input prefix={<MailOutlined />} placeholder='Email' />
				</Form.Item>

				<Form.Item
					name='password'
					label='New Password'
					rules={[
						({ getFieldValue }) => ({
							validator(_, value) {
								if (!value || value.length >= 6) return Promise.resolve();
								return Promise.reject(
									new Error("Password should be min 6 characters long")
								);
							},
						}),
					]}
				>
					<Input.Password
						prefix={<LockOutlined />}
						placeholder='(leave empty to keep unchanged)'
					/>
				</Form.Item>

				<Form.Item
					name='password2'
					label='Confirm Password'
					dependencies={["password"]}
					rules={[
						({ getFieldValue }) => ({
							validator(_, value) {
								const pwd = getFieldValue("password");
								if (!pwd && !value) return Promise.resolve(); // both empty
								if (pwd && value === pwd) return Promise.resolve();
								return Promise.reject(new Error("Passwords do not match"));
							},
						}),
					]}
				>
					<Input.Password
						prefix={<LockOutlined />}
						placeholder='Confirm Password'
					/>
				</Form.Item>
			</Form>
		</Modal>
	);
};

export default UpdateAccountModal;
