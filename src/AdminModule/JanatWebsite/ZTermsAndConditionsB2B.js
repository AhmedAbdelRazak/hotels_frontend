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

const ZTermsAndConditionsB2B = ({
	termsAndConditionEnglish_B2B,
	termsAndConditionArabic_B2B,
	setTermsAndConditionEnglish_B2B,
	setTermsAndConditionArabic_B2B,
}) => {
	return (
		<ZTermsAndConditionsWrapper>
			<div className='form-group'>
				<label className='text-muted'>
					Terms and Conditions For Hotels (English)
				</label>
				<ReactQuill
					value={termsAndConditionEnglish_B2B}
					onChange={setTermsAndConditionEnglish_B2B}
					modules={{
						toolbar: { container: toolbarOptions },
						clipboard: { matchVisual: false },
					}}
					style={{ height: "400px" }}
				/>
			</div>

			<div className='form-group mt-5'>
				<label className='text-muted mt-5'>
					Terms and Conditions For Hotels (Arabic)
				</label>
				<ReactQuill
					value={termsAndConditionArabic_B2B}
					onChange={setTermsAndConditionArabic_B2B}
					modules={{
						toolbar: { container: toolbarOptions },
						clipboard: { matchVisual: false },
					}}
					style={{ height: "400px" }}
					className='arabic-editor'
				/>
			</div>
		</ZTermsAndConditionsWrapper>
	);
};

export default ZTermsAndConditionsB2B;

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

	/* Ensure Arabic text in the editor goes right-to-left */
	.arabic-editor .ql-editor {
		direction: rtl;
		text-align: right;
	}
`;
