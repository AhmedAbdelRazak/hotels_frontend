/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import styled from "styled-components";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import { cloudinaryUpload1 } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCardAboutUs from "./ImageCardAboutUs";

const ZAboutUsAdd = ({ addThumbnail, setAddThumbnail }) => {
	// eslint-disable-next-line
	const [loading, setLoading] = useState("");

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const fileUploadAndResizeThumbNail = (e) => {
		// console.log(e.target.files);
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
		<ZAboutUsAddWrapper>
			<div className=''>
				<div className='container mt-3'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						About Us Banner
					</h3>
					<div className=''>{FileUploadThumbnail()}</div>
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
	}

	@media (max-width: 1750px) {
		background: white;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
