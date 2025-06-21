"use client";

import { useState } from "react";
import { FiDownload, FiFile, FiImage, FiVideo, FiMusic } from "react-icons/fi";
import { AiFillFilePdf } from "react-icons/ai";
import {
  BsFileEarmarkWord,
  BsFileEarmarkExcel,
  BsFileEarmarkPpt,
} from "react-icons/bs";

const API_BASE_URL = "http://localhost:3000";

const isImage = (mimetype) => mimetype && mimetype.startsWith("image");
const isPDF = (mimetype) => mimetype && mimetype === "application/pdf";
const isVideo = (mimetype) => mimetype && mimetype.startsWith("video");
const isAudio = (mimetype) => mimetype && mimetype.startsWith("audio");
const isWord = (mimetype) =>
  mimetype && (mimetype.includes("word") || mimetype.includes("document"));
const isExcel = (mimetype) =>
  mimetype &&
  (mimetype.includes("excel") ||
    mimetype.includes("spreadsheet") ||
    mimetype.includes("sheet"));
const isPowerPoint = (mimetype) =>
  mimetype &&
  (mimetype.includes("powerpoint") || mimetype.includes("presentation"));

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

const getFileIcon = (mimetype, fileName, isSender = false) => {
  const iconColor = isSender ? "text-white/90" : "";

  // Check by file extension if mimetype is not reliable
  const extension = fileName?.toLowerCase().split(".").pop();

  if (extension === "xlsx" || extension === "xls" || isExcel(mimetype)) {
    return (
      <BsFileEarmarkExcel
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-green-600"}`}
      />
    );
  }
  if (extension === "docx" || extension === "doc" || isWord(mimetype)) {
    return (
      <BsFileEarmarkWord
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-blue-600"}`}
      />
    );
  }
  if (extension === "pptx" || extension === "ppt" || isPowerPoint(mimetype)) {
    return (
      <BsFileEarmarkPpt
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-orange-500"}`}
      />
    );
  }
  if (extension === "pdf" || isPDF(mimetype)) {
    return (
      <AiFillFilePdf
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-red-500"}`}
      />
    );
  }
  if (isImage(mimetype))
    return (
      <FiImage
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-blue-500"}`}
      />
    );
  if (isVideo(mimetype))
    return (
      <FiVideo
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-purple-500"}`}
      />
    );
  if (isAudio(mimetype))
    return (
      <FiMusic
        className={`w-6 h-6 ${isSender ? "text-white/90" : "text-green-500"}`}
      />
    );

  return (
    <FiFile
      className={`w-6 h-6 ${isSender ? "text-white/90" : "text-gray-500"}`}
    />
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
};

const ImagePreview = ({ file, isSender = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDownloading(true);

    setTimeout(() => {
      const link = document.createElement("a");
      link.href = getFileUrl(file);
      link.download = file.originalName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
    }, 500);
  };

  return (
    <div className="relative group">
      {!imageLoaded && !imageError && (
        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center animate-pulse">
          <FiImage className="w-8 h-8 text-gray-400" />
        </div>
      )}

      {!imageError && (
        <img
          src={getFileUrl(file) || "/placeholder.svg"}
          alt={file.originalName}
          className={`max-w-full max-h-64 rounded-lg border shadow-sm transition-all duration-300 hover:shadow-md ${
            imageLoaded ? "block" : "hidden"
          }`}
          style={{ objectFit: "cover" }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {imageError && (
        <div className="w-full h-48 bg-gray-50 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
          <FiImage className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-500">Failed to load image</span>
        </div>
      )}

      {imageLoaded && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-blue-600 px-4 py-2 rounded-full font-medium transition-all duration-200 flex items-center gap-2 shadow-lg"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Downloading...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4" />
                <span className="text-sm">Download</span>
              </>
            )}
          </button>
        </div>
      )}

      <div
        className={`mt-2 flex items-center justify-between text-xs ${
          isSender ? "text-white/70" : "text-gray-500"
        }`}
      >
        <span className="truncate">{file.originalName}</span>
        <span>{formatFileSize(file.size)}</span>
      </div>
    </div>
  );
};

const FilePreview = ({ file, isSender = false }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    setIsDownloading(true);

    setTimeout(() => {
      const link = document.createElement("a");
      link.href = getFileUrl(file);
      link.download = file.originalName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
    }, 500);
  };

  return (
    <div
      className={`group p-4 rounded-xl border transition-all duration-300 ${
        isSender
          ? "bg-white/10 border-white/20 backdrop-blur-sm"
          : "bg-gradient-to-br from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 border-gray-200/60 shadow-sm hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* File icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getFileIcon(file.mimetype, file.originalName, isSender)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p
            className={`truncate text-sm font-medium mb-1 ${
              isSender ? "text-white" : "text-gray-900"
            }`}
          >
            {file.originalName}
          </p>
          <div
            className={`flex items-center gap-2 text-xs mb-3 ${
              isSender ? "text-white/70" : "text-gray-500"
            }`}
          >
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span className="capitalize">
              {file.mimetype?.split("/")[1] || "file"}
            </span>
          </div>

          {/* Download button - moved below file info */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              isSender
                ? "bg-white/20 hover:bg-white/30 text-white"
                : "bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-blue-500 shadow-sm"
            }`}
            title="Download file"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <FiDownload className="w-4 h-4" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const renderContent = (message, isSender = false) => {
  // Add detailed debug logging to see the actual message structure
  console.log(
    "renderContent: Message object received:",
    JSON.stringify(message, null, 2)
  );

  // Check for message content in all possible properties
  // Prioritize 'message' property since that's what the server uses
  const text =
    message?.message ||
    message?.content ||
    message?.text ||
    (message?.body ? message.body : "") ||
    "";

  console.log("renderContent: Extracted text:", text);
  console.log("renderContent: Message keys:", Object.keys(message || {}));

  const hasFiles = message?.files && message.files.length > 0;

  return (
    <div className="space-y-3">
      {/* Message text */}
      {text && (
        <div
          className="text-base leading-[1.5]"
          style={{ color: isSender ? "#ffffff" : "#374151" }}
        >
          {text}
        </div>
      )}

      {/* Files */}
      {hasFiles && (
        <div className="space-y-2">
          {message.files.map((file, index) => (
            <div key={file._id || index} className="max-w-sm">
              {isImage(file.mimetype) ? (
                <ImagePreview file={file} isSender={isSender} />
              ) : (
                <FilePreview file={file} isSender={isSender} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default renderContent;
