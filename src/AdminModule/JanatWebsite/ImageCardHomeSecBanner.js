import React from "react";
import styled from "styled-components";
import imageImage from "../../GeneralImages/UploadImageImage.jpg";

const ImageCardHomeSecBanner = ({
	setAddThumbnail,
	handleImageRemove,
	addThumbnail,
	fileUploadAndResizeThumbNail,
}) => {
	const handleFieldChange = (field, value) => {
		const updatedImage = {
			...addThumbnail.images[0], // Assuming only one image is allowed
			[field]: value,
		};
		setAddThumbnail({ ...addThumbnail, images: [updatedImage] });
	};

	return (
		<ImageCardHomeSecBannerWrapper>
			<div className='card card-flush py-4'>
				<div className='card-body text-center pt-0'>
					<div
						className='image-input image-input-empty image-input-outline image-input-placeholder mb-3'
						data-kt-image-input='true'
					>
						<div className='image-input-wrapper w-180px h-180px'></div>
						<div className='col-12'>
							{addThumbnail &&
								addThumbnail.images &&
								addThumbnail.images.length > 0 &&
								addThumbnail.images.map((image, index) => (
									<div
										className='image-container m-3 col-6'
										key={image.public_id}
									>
										<button
											type='button'
											className='close'
											onClick={() => handleImageRemove(image.public_id)}
											aria-label='Close'
										>
											<span aria-hidden='true'>&times;</span>
										</button>
										<img
											src={image.url}
											alt='Img Not Found'
											className='thumbnail-image'
										/>
										<div className='input-fields'>
											<input
												type='text'
												placeholder='Title (You can leave blank)'
												value={image.title || ""}
												onChange={(e) =>
													handleFieldChange("title", e.target.value)
												}
											/>
											<input
												type='text'
												placeholder='Subtitle (You can leave blank)'
												value={image.subTitle || ""}
												onChange={(e) =>
													handleFieldChange("subTitle", e.target.value)
												}
											/>
											<input
												type='text'
												placeholder='Button Title (You can leave blank)'
												value={image.buttonTitle || ""}
												onChange={(e) =>
													handleFieldChange("buttonTitle", e.target.value)
												}
											/>
											<input
												type='text'
												placeholder='Redirect URL (You can leave blank)'
												value={image.pageRedirectURL || ""}
												onChange={(e) =>
													handleFieldChange("pageRedirectURL", e.target.value)
												}
											/>
											<input
												type='text'
												placeholder='Button Background Color (You can leave blank)'
												value={image.btnBackgroundColor || ""}
												onChange={(e) =>
													handleFieldChange(
														"btnBackgroundColor",
														e.target.value
													)
												}
											/>
										</div>
									</div>
								))}
						</div>
						{!addThumbnail.images || addThumbnail.images.length === 0 ? (
							<label
								className=''
								style={{ cursor: "pointer", fontSize: "0.95rem" }}
							>
								<img
									src={imageImage}
									alt='imageUpload'
									style={{ width: "75%" }}
								/>
								<input
									type='file'
									hidden
									accept='images/*'
									onChange={fileUploadAndResizeThumbNail}
									required
								/>
							</label>
						) : null}
					</div>

					<div className='text-muted fs-7'>
						Width: 1920px, Height: 600px;
						<br />
						Set the secondary banner image. Only *.png, *.jpg and *.jpeg image
						files are accepted.
					</div>
				</div>
			</div>
		</ImageCardHomeSecBannerWrapper>
	);
};

export default ImageCardHomeSecBanner;

const ImageCardHomeSecBannerWrapper = styled.div`
	.card {
		border: 1px #f6f6f6 solid !important;
	}

	.image-container {
		position: relative;
		display: inline-block;
	}

	.thumbnail-image {
		width: 130px;
		height: 130px;
		box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, 0.2);
	}

	.input-fields {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.input-fields input {
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		width: 100%;
	}

	.close {
		position: absolute;
		top: -20px;
		right: 36%;
		color: white;
		background: black;
		font-size: 20px;
		border: none;
		cursor: pointer;
	}
`;
