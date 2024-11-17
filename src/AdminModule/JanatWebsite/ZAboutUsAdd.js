/** @format */

import React, { useState } from "react";
import styled from "styled-components";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import { cloudinaryUpload1 } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCardAboutUs from "./ImageCardAboutUs";
import ReactQuill from "react-quill";

const toolbarOptions = [
	[{ header: [1, 2, 3, 4, 5, 6, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
	["link", "image", "video"],
	["clean"],
];

const ZAboutUsAdd = ({
	addThumbnail,
	setAddThumbnail,
	aboutUsEnglish,
	setAboutUsEnglish,
	aboutUsArabic,
	setAboutUsArabic,
}) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState(false);

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const fileUploadAndResizeThumbNail = (e) => {
		let files = e.target.files;
		let allUploadedFiles = addThumbnail;
		if (files) {
			for (let i = 0; i < files.length; i++) {
				Resizer.imageFileResizer(
					files[i],
					720,
					720,
					"JPEG",
					100,
					0,
					(uri) => {
						cloudinaryUpload1(user._id, token, { image: uri })
							.then((data) => {
								allUploadedFiles.push(data);
								setAddThumbnail({ ...addThumbnail, images: allUploadedFiles });
							})
							.catch((err) => {
								console.log("CLOUDINARY UPLOAD ERR", err);
							});
					},
					"base64"
				);
			}
		}
	};

	const handleImageRemove = (public_id) => {
		setLoading(true);
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			)
			.then((res) => {
				setLoading(false);
				setAddThumbnail([]); // Clear images after removal
			})
			.catch((err) => {
				console.log(err);
				setLoading(false);
				setTimeout(() => {
					window.location.reload(false);
				}, 1000);
			});
	};

	const handleQuillChangeEnglish = (value) => {
		setAboutUsEnglish(value);
	};

	const handleQuillChangeArabic = (value) => {
		setAboutUsArabic(value);
	};

	const FileUploadThumbnail = () => {
		return (
			<>
				<ImageCardAboutUs
					addThumbnail={addThumbnail}
					handleImageRemove={handleImageRemove}
					setAddThumbnail={setAddThumbnail}
					fileUploadAndResizeThumbNail={fileUploadAndResizeThumbNail}
				/>
			</>
		);
	};

	return (
		<ZAboutUsAddWrapper>
			<div className='container mt-3'>
				<h3
					style={{ color: "#009ef7", fontWeight: "bold" }}
					className='mt-1 mb-3 text-center'
				>
					About Us Banner and Descriptions
				</h3>
				<div>{FileUploadThumbnail()}</div>
				<div className='form-group mt-4'>
					<label className='text-muted'>About Us English</label>
					<StyledQuillWrapper>
						<ReactQuill
							value={aboutUsEnglish}
							onChange={handleQuillChangeEnglish}
							modules={{
								toolbar: { container: toolbarOptions },
								clipboard: { matchVisual: false },
							}}
							style={{ height: "200px" }}
						/>
					</StyledQuillWrapper>
				</div>
				<div className='form-group mt-4'>
					<label className='text-muted'>About Us Arabic</label>
					<StyledQuillWrapper>
						<ReactQuill
							value={aboutUsArabic}
							onChange={handleQuillChangeArabic}
							modules={{
								toolbar: { container: toolbarOptions },
								clipboard: { matchVisual: false },
							}}
							style={{ height: "200px" }}
						/>
					</StyledQuillWrapper>
				</div>
			</div>
		</ZAboutUsAddWrapper>
	);
};

export default ZAboutUsAdd;

const ZAboutUsAddWrapper = styled.div`
	.container {
		border: 2px solid lightgrey;
		border-radius: 20px;
		background: white;
		padding: 20px;
	}

	@media (max-width: 1750px) {
		background: white;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;

const StyledQuillWrapper = styled.div`
	.ql-toolbar {
		background-color: #f3f3f3;
		border-radius: 5px;
		border: 1px solid #ccc;
	}

	.ql-container {
		border: 1px solid #ccc;
		border-radius: 5px;
		min-height: 150px; /* Ensure there is a minimum height */
		background-color: #fff; /* Make sure the background is white */
	}

	.ql-editor {
		min-height: 150px; /* Adjust height to your needs */
		max-height: 300px; /* Limit maximum height */
		overflow-y: auto; /* Enable scrolling if content overflows */
		font-size: 14px; /* Adjust font size */
	}

	.ql-editor.ql-blank::before {
		color: #999; /* Placeholder color */
	}
`;
