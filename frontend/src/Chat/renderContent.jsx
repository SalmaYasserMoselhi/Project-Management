// import React from "react";
// import { FiDownload, FiFile } from "react-icons/fi";
// import { AiFillFilePdf } from "react-icons/ai";

// const API_BASE_URL = "http://localhost:3000"; // أو استخدم import.meta.env.VITE_API_BASE_URL
// console.log("API_BASE_URL:", API_BASE_URL);

// const isImage = (mimetype) => mimetype && mimetype.startsWith("image");
// const isPDF = (mimetype) => mimetype && mimetype === "application/pdf";

// const getFileUrl = (file) => {
//   let url = file.url;
//   if (url && url.includes("/files/")) {
//     url = url.replace("/files/", "/attachments/");
//   }
//   if (url && url.startsWith("/")) {
//     url = API_BASE_URL + url;
//   }
//   return url;
// };

// const renderContent = (message) => {
//   const text = message.content || message.message || "";
//   const hasFiles = message.files && message.files.length > 0;

//   if (!text && !hasFiles) {
//     return (
//       <span className="text-gray-400 italic flex items-center gap-2">
//         <FiFile className="w-5 h-5" /> File sent
//       </span>
//     );
//   }

//   return (
//     <div>
//       {text && <p className="text-[0.9rem] leading-[1.4] mb-2">{text}</p>}

//       {hasFiles &&
//         message.files.map((file, index) => (
//           <div
//             key={file._id || index}
//             className="flex flex-col bg-white/50 p-4 rounded-xl mb-2 shadow border border-gray-200"
//             style={{ minWidth: 220, maxWidth: 320 }}
//           >
//             {/* Image preview */}
//             {isImage(file.mimetype) && (
//               <img
//                 src={getFileUrl(file)}
//                 alt={file.originalName}
//                 className="max-w-full max-h-[180px] rounded mb-2 border"
//                 style={{ objectFit: "cover" }}
//               />
//             )}

//             {/* PDF preview */}
//             {isPDF(file.mimetype) && (
//               <div className="flex items-center gap-2 mb-2">
//                 <AiFillFilePdf className="w-8 h-8 text-red-500" />
//                 <span className="font-bold text-red-700">PDF Document</span>
//               </div>
//             )}

//             {/* File info and download button */}
//             <div className="flex items-center gap-2">
//               {!isImage(file.mimetype) && !isPDF(file.mimetype) && (
//                 <FiFile className="w-6 h-6 text-gray-500" />
//               )}
//               <div className="flex-1 min-w-0">
//                 <p className="truncate text-sm font-medium">
//                   {file.originalName}
//                 </p>
//                 <p className="text-xs text-gray-500">
//                   {(file.size / 1024 / 1024).toFixed(2)} MB
//                 </p>
//               </div>
//               {/* Download button */}
//               <a
//                 href={getFileUrl(file)}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 download={file.originalName}
//                 className="p-2 rounded-full transition-colors"
//                 title="Download"
//               >
//                 <FiDownload className="w-5 h-5" />
//               </a>
//             </div>
//           </div>
//         ))}
//     </div>
//   );
// };

// export default renderContent;

import React, { useState } from "react";
import { FiDownload, FiFile, FiImage, FiVideo, FiMusic } from "react-icons/fi";
import {
  AiFillFilePdf,
  AiFillFileWord,
  AiFillFileExcel,
  AiFillFileZip,
} from "react-icons/ai";
import { toast } from "react-toastify";

const BASE_FILE_URL = "http://localhost:3000";

// تحديد نوع الملف
const getFileType = (mimetype) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.includes("word") || mimetype.includes("document")) return "word";
  if (mimetype.includes("excel") || mimetype.includes("sheet")) return "excel";
  if (mimetype.includes("zip") || mimetype.includes("compressed")) return "zip";
  return "other";
};

// الحصول على أيقونة مناسبة لنوع الملف
const getFileIcon = (mimetype) => {
  const fileType = getFileType(mimetype);
  switch (fileType) {
    case "image":
      return <FiImage className="w-6 h-6 text-blue-500" />;
    case "video":
      return <FiVideo className="w-6 h-6 text-red-500" />;
    case "audio":
      return <FiMusic className="w-6 h-6 text-green-500" />;
    case "pdf":
      return <AiFillFilePdf className="w-6 h-6 text-red-500" />;
    case "word":
      return <AiFillFileWord className="w-6 h-6 text-blue-500" />;
    case "excel":
      return <AiFillFileExcel className="w-6 h-6 text-green-500" />;
    case "zip":
      return <AiFillFileZip className="w-6 h-6 text-yellow-500" />;
    default:
      return <FiFile className="w-6 h-6 text-gray-500" />;
  }
};

const getFileUrl = (file) => {
  let fileId = (file._id || "").toString().trim();
  const base = BASE_FILE_URL.replace(/\/$/, "").trim();
  let url = `/api/v1/attachments/${fileId}/download`;
  url = `${base}${url}`;
  console.log("Download URL:", url);
  return url;
};

const handleDownload = async (file) => {
  try {
    console.log("Trying to download file:", file._id);
    const response = await fetch(getFileUrl(file), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) {
      console.error("Download failed:", {
        status: response.status,
        statusText: response.statusText,
        file,
        url: getFileUrl(file),
      });
      throw new Error(`Failed to download file (status: ${response.status})`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.originalName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading file:", error, file);
    toast.error("Failed to download file");
  }
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " bytes";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
};

const renderContent = (message) => {
  const text = message.content || message.message || "";

  const files = message.files || message.attachments || [];
  const hasFiles = files.length > 0;

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
        files.map((file, index) => {
          const fileType = getFileType(file.mimetype);
          return (
            <div
              key={file._id || index}
              className="flex flex-col bg-white/80 p-4 rounded-xl mb-2 shadow border border-gray-200 max-w-xs min-w-[220px]"
            >
              {/* Image preview */}
              {fileType === "image" && (
                <div className="relative group flex flex-col items-center">
                  {console.log("File object:", file)}
                  {console.log(
                    "Image preview URL:",
                    `${BASE_FILE_URL}/uploads/attachments/${file.filename}`
                  )}
                  <img
                    src={`${BASE_FILE_URL}/uploads/attachments/${file.filename}`}
                    alt={file.originalName}
                    className="max-w-full max-h-[200px] rounded-lg mb-2 border object-cover w-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      const errorMsg = document.createElement("div");
                      errorMsg.textContent = "Error loading image";
                      errorMsg.style.color = "red";
                      errorMsg.style.margin = "1rem auto";
                      errorMsg.style.textAlign = "center";
                      e.target.parentNode.appendChild(errorMsg);
                    }}
                  />
                  <button
                    onClick={() => handleDownload(file)}
                    className="mt-2 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* PDF preview (show icon, name, size, and Download button) */}
              {fileType === "pdf" && (
                <div className="flex flex-col items-center">
                  <AiFillFilePdf className="w-16 h-16 text-red-500 mb-2" />
                  {/* Optionally, show a preview using <embed> if you want: */}
                  {/* <embed src={getFileUrl(file)} type="application/pdf" width="100%" height="120px" className="rounded mb-2 border" /> */}
                  <span className="font-bold text-center mb-1">
                    {file.originalName}
                  </span>
                  <span className="text-xs text-gray-500 mb-2">
                    {formatFileSize(file.size)}, PDF Document
                  </span>
                  <button
                    onClick={() => handleDownload(file)}
                    className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* Video preview */}
              {fileType === "video" && (
                <div className="relative group flex flex-col items-center">
                  <video
                    src={getFileUrl(file)}
                    className="max-w-full max-h-[200px] rounded-lg mb-2 border w-full"
                    controls
                  />
                  <button
                    onClick={() => handleDownload(file)}
                    className="mt-2 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* Audio preview */}
              {fileType === "audio" && (
                <div className="bg-gray-50 p-3 rounded-lg mb-2 flex flex-col items-center">
                  <audio src={getFileUrl(file)} controls className="w-full" />
                  <button
                    onClick={() => handleDownload(file)}
                    className="mt-2 px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Download
                  </button>
                </div>
              )}

              {/* Other file types */}
              {["image", "pdf", "video", "audio"].indexOf(fileType) === -1 && (
                <div className="flex flex-col items-center">
                  {getFileIcon(file.mimetype)}
                  <span className="font-bold text-center mb-1 mt-2">
                    {file.originalName}
                  </span>
                  <span className="text-xs text-gray-500 mb-2">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => handleDownload(file)}
                    className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                  >
                    Download
                  </button>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default renderContent;
