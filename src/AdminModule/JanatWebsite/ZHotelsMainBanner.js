/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import styled from "styled-components";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import { cloudinaryUpload1 } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCardHotelPage from "./ImageCardHotelPage";

const ZHotelsMainBanner = ({ addThumbnail, setAddThumbnail }) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState("");

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const fileUploadAndResizeThumbNail = (e) => {
		let files = e.target.files; // Get the files from input
		let allUploadedFiles = addThumbnail; // Current uploaded files array

		if (files) {
			for (let i = 0; i < files.length; i++) {
				const file = files[i];

				// Validate file type (support images only)
				if (!file.type.startsWith("image/")) {
					alert("Only image files are allowed!");
					continue; // Skip non-image files
				}

				// Determine the image format dynamically
				const fileType = file.type.split("/")[1].toUpperCase(); // e.g., "JPEG", "PNG", etc.
				const resizeFormat = ["JPEG", "PNG", "WEBP"].includes(fileType)
					? fileType
					: "JPEG"; // Default to JPEG if format is unsupported

				// Resize and upload the image
				Resizer.imageFileResizer(
					file,
					720, // Resize width
					720, // Resize height
					resizeFormat, // Use the determined format
					100, // Image quality
					0, // Rotation (0 degrees)
					(uri) => {
						// Upload resized image to Cloudinary
						cloudinaryUpload1(user._id, token, { image: uri })
							.then((data) => {
								// Add uploaded image data to the state
								allUploadedFiles.push(data);
								setAddThumbnail({ ...addThumbnail, images: allUploadedFiles });
							})
							.catch((err) => {
								console.error("CLOUDINARY UPLOAD ERROR", err);
							});
					},
					"base64" // Output format
				);
			}
		}
	};

	const FileUploadThumbnail = () => {
		return (
			<>
				<ImageCardHotelPage
					addThumbnail={addThumbnail}
					handleImageRemove={handleImageRemove}
					setAddThumbnail={setAddThumbnail}
					fileUploadAndResizeThumbNail={fileUploadAndResizeThumbNail}
				/>
			</>
		);
	};

	const handleImageRemove = (public_id) => {
		setLoading(true);
		// console.log("remove image", public_id);
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
				// eslint-disable-next-line
				const { images } = addThumbnail;
				// let filteredImages = images.filter((item) => {
				// 	return item.public_id !== public_id;
				// });
				setAddThumbnail([]);
			})
			.catch((err) => {
				console.log(err);
				setLoading(false);
				setTimeout(function () {
					window.location.reload(false);
				}, 1000);
			});
	};

	return (
		<ZHotelsMainBannerWrapper>
			<div className=''>
				<div className='container mt-3'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Main Hotels Page Banner
					</h3>
					<div className=''>{FileUploadThumbnail()}</div>
				</div>
			</div>
		</ZHotelsMainBannerWrapper>
	);
};

export default ZHotelsMainBanner;

const ZHotelsMainBannerWrapper = styled.div`
	.container {
		border: 2px solid lightgrey;
		border-radius: 20px;
		background: white;
	}

	@media (max-width: 1750px) {
		background: white;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
