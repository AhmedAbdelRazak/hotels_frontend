/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import styled from "styled-components";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import { cloudinaryUpload1 } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCardHomeSecBanner from "./ImageCardHomeSecBanner";

const ZHomePageBanner3 = ({ addThumbnail, setAddThumbnail }) => {
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
				<ImageCardHomeSecBanner
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
		<ZHomePageBanner3Wrapper>
			<div className=''>
				<div className='container mt-3'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Home Page Second Section Banner Before Footer
					</h3>
					<div className=''>{FileUploadThumbnail()}</div>
				</div>
			</div>
		</ZHomePageBanner3Wrapper>
	);
};

export default ZHomePageBanner3;

const ZHomePageBanner3Wrapper = styled.div`
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
