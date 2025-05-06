"use client";

import React from "react";

import { FiDownload, FiFile } from "react-icons/fi";

const renderContent = (message) => {
  const text = message.content || message.message || "";

  switch (message.type) {
    case "image":
      return (
        <img
          src={text}
          alt="msg"
          className="max-w-[300px] rounded-lg"
          loading="lazy"
        />
      );
    case "file":
      return (
        <div className="flex items-center gap-2 bg-white/80 p-3 rounded-lg">
          <FiFile className="w-6 h-6 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{message.fileName}</p>
            <p className="text-xs text-gray-500">
              {(message.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
          <a
            href={message.fileUrl}
            download={message.fileName}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            title="Download File"
          >
            <FiDownload className="w-4 h-4" />
          </a>
        </div>
      );
    default:
      return <p className="text-[0.9rem] leading-[1.4]">{text}</p>;
  }
};
export default renderContent;
