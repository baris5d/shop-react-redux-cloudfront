import React from "react";
import axios from "axios";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { getBasicAuthHeaders } from "~/utils/auth";

type CSVFileImportProps = {
  url: string;
  title: string;
};

export default function CSVFileImport({ url, title }: CSVFileImportProps) {
  const [file, setFile] = React.useState<File>();
  const [isUploading, setIsUploading] = React.useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFile(file);
    }
  };

  const removeFile = () => {
    setFile(undefined);
  };

  const uploadFile = async () => {
    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const response = await axios.get<{ signedUrl: string }>(url, {
        params: {
          name: encodeURIComponent(file.name),
        },
        headers: getBasicAuthHeaders(),
      });

      await fetch(response.data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "text/csv",
        },
        body: file,
      });

      setFile(undefined);
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {!file ? (
        <input type="file" accept=".csv,text/csv" onChange={onFileChange} />
      ) : (
        <div>
          <button onClick={removeFile} disabled={isUploading}>
            Remove file
          </button>
          <button onClick={uploadFile} disabled={isUploading}>
            {isUploading ? "Uploading..." : "Upload file"}
          </button>
        </div>
      )}
    </Box>
  );
}
