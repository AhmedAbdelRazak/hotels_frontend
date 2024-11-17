import React from "react";
import styled from "styled-components";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css"; // Import Quill CSS for styling

const toolbarOptions = [
	[{ header: [1, 2, 3, 4, 5, 6, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
	["link", "image", "video"],
	["clean"],
];

const ZTermsAndConditions = ({
	termsAndConditionEnglish,
	termsAndConditionArabic,
	setTermsAndConditionEnglish,
	setTermsAndConditionArabic,
}) => {
	return (
		<ZTermsAndConditionsWrapper>
			<div className='form-group'>
				<label className='text-muted'>
					Terms and Conditions For Guests (English)
				</label>
				<ReactQuill
					value={termsAndConditionEnglish}
					onChange={setTermsAndConditionEnglish}
					modules={{
						toolbar: { container: toolbarOptions },
						clipboard: { matchVisual: false },
					}}
					style={{ height: "200px" }}
				/>
			</div>

			<div className='form-group mt-5'>
				<label className='text-muted mt-5'>
					Terms and Conditions For Guests (Arabic)
				</label>
				<ReactQuill
					value={termsAndConditionArabic}
					onChange={setTermsAndConditionArabic}
					modules={{
						toolbar: { container: toolbarOptions },
						clipboard: { matchVisual: false },
					}}
					style={{ height: "200px" }}
				/>
			</div>
		</ZTermsAndConditionsWrapper>
	);
};

export default ZTermsAndConditions;

const ZTermsAndConditionsWrapper = styled.div`
	min-height: 700px;

	.form-group {
		margin-bottom: 20px;
	}

	.ql-toolbar {
		background-color: #f3f3f3;
		border-radius: 5px;
		border: 1px solid #ccc;
	}

	.ql-container {
		border: 1px solid #ccc;
		border-radius: 5px;
		background-color: #fff;
	}

	.ql-editor {
		min-height: 150px;
		max-height: 300px;
		overflow-y: auto;
		font-size: 14px;
	}

	.ql-editor.ql-blank::before {
		color: #999;
	}
`;
