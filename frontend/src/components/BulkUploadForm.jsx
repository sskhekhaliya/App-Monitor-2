// frontend/src/components/BulkUploadForm.jsx
import React, { useState } from 'react';
import './BulkUploadForm.css';
import * as XLSX from 'xlsx'; // Import the xlsx library

const BulkUploadForm = ({ onUpload, onClose, fileType }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let data;
        if (fileType === 'json') {
          // JSON parsing logic (your existing code)
          data = JSON.parse(event.target.result);
        } else if (fileType === 'excel') {
          // Excel parsing logic
          const workbook = XLSX.read(event.target.result, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet);
        }

        if (Array.isArray(data)) {
          onUpload(data, fileType);
        } else {
          alert("The file content is not a valid array of applications.");
        }
      } catch (err) {
        alert("Error parsing file. Please check the file format.");
        console.error("File parsing error:", err);
      }
      onClose();
    };

    if (fileType === 'excel') {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const acceptedFormats = fileType === 'json' ? '.json' : '.xlsx, .xls';

  return (
    <div className="bulk-upload-form">
      <h3>Bulk Upload Applications ({fileType.toUpperCase()})</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="uploadFile">Select {fileType.toUpperCase()} File</label>
          <input
            type="file"
            id="uploadFile"
            accept={acceptedFormats}
            onChange={handleFileChange}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-button">Upload</button>
          <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default BulkUploadForm;