import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addAttachment,
  removeAttachment,
  uploadAttachments,
  deleteAttachment,
} from "../features/Slice/cardSlice/cardDetailsSlice";
import { Plus, X, Upload, FileText, Check, AlertCircle } from "lucide-react";

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

  // توفير وظائف لمكون الوالد عبر ref
  useImperativeHandle(ref, () => ({
    getPendingFiles: () => pendingFiles,
  }));

  // Effect to check for valid cardId
  useEffect(() => {
    const targetCardId = cardId || currentCardId;
    // If we have a card ID and pending files, we can now upload them
    if (targetCardId && pendingFiles.length > 0) {
      handleUploadPendingFiles(targetCardId);
    }
  }, [cardId, currentCardId, pendingFiles]);

  // Upload pending files when card ID becomes available
  const handleUploadPendingFiles = async (targetCardId) => {
    try {
      await dispatch(
        uploadAttachments({
          cardId: targetCardId,
          files: pendingFiles,
        })
      ).unwrap();

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      // Clear pending files after successful upload
      setPendingFiles([]);
      setIsPendingMode(false);
    } catch (err) {
      console.error("Error uploading pending files:", err);
    }
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  // إضافة ملف جديد
  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    const targetCardId = cardId || currentCardId;

    // If we don't have a card ID yet, store files for later upload
    if (!targetCardId) {
      // Store files for later
      setPendingFiles(Array.from(files));
      setIsPendingMode(true);
      return;
    }

    try {
      // استخدام async thunk لرفع الملفات
      await dispatch(
        uploadAttachments({
          cardId: targetCardId,
          files: Array.from(files),
        })
      ).unwrap();

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      console.error("Error in handleFileChange:", err);
    } finally {
      // إعادة تعيين حقل الإدخال
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // حذف مرفق
  const handleDeleteAttachment = async (attachmentId) => {
    const targetCardId = cardId || currentCardId;
    if (!targetCardId) return;

    try {
      // استخدام async thunk لحذف المرفق
      await dispatch(
        deleteAttachment({
          cardId: targetCardId,
          attachmentId,
        })
      ).unwrap();
    } catch (err) {
      console.error("Error deleting attachment:", err);
      alert("Failed to delete attachment");
    }
  };

  // Remove pending file
  const handleRemovePendingFile = (index) => {
    const newPendingFiles = [...pendingFiles];
    newPendingFiles.splice(index, 1);
    setPendingFiles(newPendingFiles);

    if (newPendingFiles.length === 0) {
      setIsPendingMode(false);
    }
  };

  // تنزيل مرفق
  const handleDownloadAttachment = (url, fileName) => {
    if (!url) return;

    // إنشاء رابط وتنزيل الملف
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-4">
      {/* العنوان وزر الإضافة - تم تغيير التصميم هنا */}
      <div className="flex items-center text-gray-500 mb-2 space-x-2">
        {/* أيقونة المرفقات */}
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
        {/* زر إضافة الملفات */}
        <button
          className="w-6 h-6 flex items-center justify-center bg-[#4D2D611A] text-[#4D2D61] rounded-md"
          onClick={() => fileInputRef.current.click()}
          disabled={uploadingAttachments}
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
      </div>

      {/* رسالة النجاح أو الخطأ */}
      {uploadSuccess && (
        <div className="mb-3 p-2 bg-green-50 text-green-600 rounded-md flex items-center gap-2 text-sm">
          <Check className="w-4 h-4" />
          Files uploaded successfully
        </div>
      )}

      {attachmentError && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4" />
          {attachmentError}
        </div>
      )}

      {/* قائمة المرفقات */}
      <div className="flex flex-wrap gap-3">
        {(attachments && attachments.length > 0) || pendingFiles.length > 0 ? (
          <>
            {/* عرض المرفقات العادية */}
            {attachments &&
              attachments.map((file) => (
                <div
                  key={file.id}
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
                        <span>{file.size}</span>
                        {file.uploadDate && (
                          <span>
                            • {new Date(file.uploadDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-2">
                    {/* زر التنزيل */}
                    {file.url && (
                      <button
                        className="text-gray-500 hover:text-blue-500 transition"
                        onClick={() =>
                          handleDownloadAttachment(file.url, file.name)
                        }
                        title="Download"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                    )}

                    {/* زر الحذف */}
                    <button
                      className="text-gray-400 hover:text-red-500 transition"
                      onClick={() => handleDeleteAttachment(file.id)}
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

            {/* عرض الملفات المعلقة بنفس شكل الملفات العادية */}
            {pendingFiles.map((file, index) => (
              <div
                key={`pending-${index}`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 shadow-sm "
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
                      <span>• Pending upload</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-2">
                  {/* زر الحذف */}
                  <button
                    className="text-gray-400 hover:text-red-500 transition"
                    onClick={() => handleRemovePendingFile(index)}
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : (
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
