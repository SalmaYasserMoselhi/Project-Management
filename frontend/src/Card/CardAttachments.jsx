import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Plus, X, Upload, FileText } from "lucide-react";

const MAX_FILES_PER_UPLOAD = 5;

const CardAttachments = forwardRef(({ cardId }, ref) => {
  const dispatch = useDispatch();
  const {
    attachments,
    id: currentCardId,
    uploadingAttachments,
    attachmentError,
  } = useSelector((state) => state.cardDetails);
  const fileInputRef = useRef(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isPendingMode, setIsPendingMode] = useState(false);
  const [localAttachments, setLocalAttachments] = useState([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState([]);

  // provide functions to the parent component through ref
  useImperativeHandle(ref, () => ({
    getPendingFiles: () => pendingFiles,
    getDeletedAttachmentIds: () => deletedAttachmentIds,
  }));

  // load attachments when the component changes
  useEffect(() => {
    if (attachments && attachments.length > 0) {
      setLocalAttachments(attachments);
    }
  }, [attachments]);

  // Handle Redux attachment errors
  useEffect(() => {
    if (attachmentError) {
      toast.error(attachmentError);
    }
  }, [attachmentError]);

  // format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // add new file
  const handleFileChange = (event) => {
    const files = event.target.files;
    if (!files.length) return;

    // check if the number of files is less than the maximum
    if (files.length > MAX_FILES_PER_UPLOAD) {
      toast.error(
        `You can only upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`
      );
      // reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // check if the total number of pending files is less than the maximum
    if (pendingFiles.length + files.length > MAX_FILES_PER_UPLOAD) {
      toast.error(
        `You can only have ${MAX_FILES_PER_UPLOAD} pending files at a time.`
      );
      // reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // add the files to the pending files list
    const newPendingFiles = [...pendingFiles];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newPendingFiles.push(file);
    }

    setPendingFiles(newPendingFiles);
    setIsPendingMode(true);

    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // delete local attachment
  const handleDeleteLocalAttachment = (attachmentId) => {
    // if the attachment is already on the server, add it to the deleted attachments list
    setDeletedAttachmentIds([...deletedAttachmentIds, attachmentId]);

    // remove the attachment from the local list
    setLocalAttachments(
      localAttachments.filter((att) => att.id !== attachmentId)
    );
  };

  // remove pending file
  const handleRemovePendingFile = (index) => {
    const newPendingFiles = [...pendingFiles];
    newPendingFiles.splice(index, 1);
    setPendingFiles(newPendingFiles);

    if (newPendingFiles.length === 0) {
      setIsPendingMode(false);
    }
  };

  const handleDownloadAttachment = (url, fileName) => {
    if (!url) {
      console.error("Missing URL for file download");
      return;
    }

    console.log("Downloading file:", fileName, "from URL:", url);

    try {
      // Create a temporary anchor element to force download
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "download"; // Force download with filename
      link.target = "_blank"; // Fallback for cross-origin files

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error(`Failed to download ${fileName}. Please try again.`);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center text-gray-500 mb-2 space-x-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m21.438 11.662l-9.19 9.19a6.003 6.003 0 1 1-8.49-8.49l9.19-9.19a4.002 4.002 0 0 1 5.66 5.66l-9.2 9.19a2.001 2.001 0 1 1-2.83-2.83l8.49-8.48"
          />
        </svg>

        <span className="font-medium text-gray-600">Attachment</span>
        <button
          className="w-6 h-6 flex items-center justify-center bg-[#4D2D611A] text-[#4D2D61] rounded-md"
          onClick={() => fileInputRef.current.click()}
          disabled={
            uploadingAttachments || pendingFiles.length >= MAX_FILES_PER_UPLOAD
          }
        >
          {uploadingAttachments ? (
            <Upload className="w-4 h-4 animate-pulse" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <span className="text-xs text-gray-400">
          (Max {MAX_FILES_PER_UPLOAD} files at a time)
        </span>
      </div>

      {/* attachments list */}
      <div className="flex flex-col gap-2 mt-2">
        {localAttachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white shadow-sm w-full max-w-full"
          >
            <div className="flex items-center gap-3 flex-grow overflow-hidden">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#4D2D611A] rounded-md">
                <FileText className="w-4 h-4 text-[#4D2D61]" />
              </div>

              <div className="overflow-hidden">
                <p
                  className="text-sm font-medium text-gray-800 truncate"
                  title={attachment.name}
                >
                  {attachment.name}
                </p>
                <div className="flex text-xs text-gray-500 items-center gap-2">
                  <span>{attachment.size || "Unknown size"}</span>
                  {attachment.uploadDate && (
                    <span>
                      {new Date(attachment.uploadDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-2">
              {/* download */}
              <button
                className="text-blue-500 hover:text-blue-700 transition"
                onClick={() =>
                  handleDownloadAttachment(attachment.url, attachment.name)
                }
                title="Download"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17"
                  />
                </svg>
              </button>
              {/* Delete */}
              <button
                className="text-gray-500 hover:text-red-500 transition"
                onClick={() => handleDeleteLocalAttachment(attachment.id)}
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {/* view pending files */}
        {pendingFiles.map((file, index) => (
          <div
            key={`pending-${index}`}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm w-full max-w-full"
          >
            <div className="flex items-center gap-3 flex-grow overflow-hidden">
              {/* أيقونة الملف */}
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-[#4D2D611A] rounded-md">
                <FileText className="w-4 h-4 text-[#4D2D61]" />
              </div>

              <div className="overflow-hidden">
                <p
                  className="text-sm font-medium text-gray-800 truncate"
                  title={file.name}
                >
                  {file.name}
                </p>
                <div className="flex text-xs text-gray-500 items-center gap-2">
                  <span>{formatFileSize(file.size)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-2">
              {/* delete */}
              <button
                className="text-gray-500 hover:text-red-500 transition"
                onClick={() => handleRemovePendingFile(index)}
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {localAttachments.length === 0 && pendingFiles.length === 0 && (
          <div className="text-gray-400 text-sm w-full text-center p-3 border border-dashed border-gray-300 rounded-lg">
            No attachments yet. Click the "+" button to upload files.
          </div>
        )}
      </div>
    </div>
  );
});

CardAttachments.displayName = "CardAttachments";

export default CardAttachments;
