import React from "react";
import { FiDownload, FiFile } from "react-icons/fi";
import { AiFillFilePdf } from "react-icons/ai";

const API_BASE_URL = "http://localhost:3000"; // أو استخدم import.meta.env.VITE_API_BASE_URL
console.log("API_BASE_URL:", API_BASE_URL);

const isImage = (mimetype) => mimetype && mimetype.startsWith("image");
const isPDF = (mimetype) => mimetype && mimetype === "application/pdf";

const getFileUrl = (file) => {
  let url = file.url;
  if (url && url.includes("/files/")) {
    url = url.replace("/files/", "/attachments/");
  }
  if (url && url.startsWith("/")) {
    url = API_BASE_URL + url;
  }
  return url;
};

const renderContent = (message) => {
  const text = message.content || message.message || "";
  const hasFiles = message.files && message.files.length > 0;

  if (!text && !hasFiles) {
    return (
      <span className="text-gray-400 italic flex items-center gap-2">
        <FiFile className="w-5 h-5" /> File sent
      </span>
    );
  }

  return (
    <div>
      {text && <p className="text-[0.9rem] leading-[1.4] mb-2">{text}</p>}

      {hasFiles &&
        message.files.map((file, index) => (
          <div
            key={file._id || index}
            className="flex flex-col bg-white/50 p-4 rounded-xl mb-2 shadow border border-gray-200"
            style={{ minWidth: 220, maxWidth: 320 }}
          >
            {/* Image preview */}
            {isImage(file.mimetype) && (
              <img
                src={getFileUrl(file)}
                alt={file.originalName}
                className="max-w-full max-h-[180px] rounded mb-2 border"
                style={{ objectFit: "cover" }}
              />
            )}

            {/* PDF preview */}
            {isPDF(file.mimetype) && (
              <div className="flex items-center gap-2 mb-2">
                <AiFillFilePdf className="w-8 h-8 text-red-500" />
                <span className="font-bold text-red-700">PDF Document</span>
              </div>
            )}

            {/* File info and download button */}
            <div className="flex items-center gap-2">
              {!isImage(file.mimetype) && !isPDF(file.mimetype) && (
                <FiFile className="w-6 h-6 text-gray-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {file.originalName}
                </p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {/* Download button */}
              <a
                href={getFileUrl(file)}
                target="_blank"
                rel="noopener noreferrer"
                download={file.originalName}
                className="p-2 rounded-full transition-colors"
                title="Download"
              >
                <FiDownload className="w-5 h-5" />
              </a>
            </div>
          </div>
        ))}
    </div>
  );
};

export default renderContent;
