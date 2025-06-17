import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addCardComment,
  fetchCardComments,
  addReplyToComment,
  updateCardComment,
  updateCardReply,
  deleteCardComment,
} from "../features/Slice/cardSlice/cardDetailsSlice";
import {
  Send,
  Trash2,
  User,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CardComments() {
  const dispatch = useDispatch();
  const comments = useSelector((state) => state.cardDetails.comments || []);
  const cardId = useSelector((state) => state.cardDetails.id);
  const { commentsLoading, commentsError } = useSelector(
    (state) => state.cardDetails
  );
  const currentUser = useSelector((state) => state.login?.user || null);

  const [newCommentText, setNewCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState("");
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState("");
  const [expandedComments, setExpandedComments] = useState({});
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openReplyMenuId, setOpenReplyMenuId] = useState(null);

  // Refs for textareas and dropdown menus
  const newCommentRef = useRef(null);
  const editTextRef = useRef(null);
  const replyTextRef = useRef(null);
  const editReplyTextRef = useRef(null);
  const dropdownRefs = useRef({});

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      // Close comment menu if clicked outside
      if (
        openMenuId &&
        dropdownRefs.current[`comment-${openMenuId}`] &&
        !dropdownRefs.current[`comment-${openMenuId}`].contains(event.target)
      ) {
        setOpenMenuId(null);
      }

      // Close reply menu if clicked outside
      if (
        openReplyMenuId &&
        dropdownRefs.current[`reply-${openReplyMenuId}`] &&
        !dropdownRefs.current[`reply-${openReplyMenuId}`].contains(event.target)
      ) {
        setOpenReplyMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId, openReplyMenuId]);

  // Auto-resize textarea function
  const autoResizeTextarea = (textareaRef) => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "40px";
    const maxHeight = 85;
    const scrollHeight = textareaRef.current.scrollHeight;
    const newHeight = Math.min(scrollHeight, maxHeight);
    textareaRef.current.style.height = `${newHeight}px`;
  };

  // Update textarea height when text changes
  useEffect(() => {
    if (newCommentRef.current) autoResizeTextarea(newCommentRef);
  }, [newCommentText]);

  useEffect(() => {
    if (editTextRef.current) autoResizeTextarea(editTextRef);
  }, [editText]);

  useEffect(() => {
    if (replyTextRef.current) autoResizeTextarea(replyTextRef);
  }, [replyText]);

  useEffect(() => {
    if (editReplyTextRef.current) autoResizeTextarea(editReplyTextRef);
  }, [editReplyText]);

  const handleAddComment = async () => {
    if (newCommentText.trim() && cardId) {
      try {
        await dispatch(
          addCardComment({
            cardId,
            text: newCommentText,
          })
        ).unwrap();
        setNewCommentText("");
      } catch (error) {
        console.error("Failed to add comment:", error);
        // يمكنك إضافة toast notification هنا لإظهار الخطأ للمستخدم
      }
    }
  };

  const handleRemoveComment = async (commentId) => {
    try {
      await dispatch(deleteCardComment({ cardId, commentId })).unwrap();
      setOpenMenuId(null);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleStartEditing = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
    setOpenMenuId(null);
    setTimeout(() => autoResizeTextarea(editTextRef), 0);
  };

  const handleSaveEdit = async () => {
    if (editText.trim() && cardId) {
      try {
        await dispatch(
          updateCardComment({
            cardId,
            commentId: editingCommentId,
            text: editText,
          })
        ).unwrap();
        setEditingCommentId(null);
        setEditText("");
      } catch (error) {
        console.error("Failed to update comment:", error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleReplyToComment = (commentId) => {
    setReplyingToId(commentId);
    setReplyText("");
    setTimeout(() => autoResizeTextarea(replyTextRef), 0);
  };

  const handleAddReply = async (commentId) => {
    if (replyText.trim() && cardId) {
      try {
        await dispatch(
          addReplyToComment({
            cardId,
            commentId,
            text: replyText,
          })
        ).unwrap();
        setReplyText("");
        setReplyingToId(null);
        setExpandedComments((prev) => ({ ...prev, [commentId]: true }));
      } catch (error) {
        console.error("Failed to add reply:", error);
      }
    }
  };

  const handleRemoveReply = async (commentId, replyId) => {
    try {
      await dispatch(
        deleteCardComment({ cardId, commentId: replyId, parentId: commentId })
      ).unwrap();
      setOpenReplyMenuId(null);
    } catch (error) {
      console.error("Failed to delete reply:", error);
    }
  };

  const handleStartEditingReply = (commentId, reply) => {
    setEditingReplyId(reply.id);
    setEditReplyText(reply.text);
    setOpenReplyMenuId(null);
    setTimeout(() => autoResizeTextarea(editReplyTextRef), 0);
  };

  const handleSaveReplyEdit = async () => {
    if (editReplyText.trim() && cardId) {
      try {
        await dispatch(
          updateCardReply({
            cardId,
            replyId: editingReplyId,
            text: editReplyText,
          })
        ).unwrap();
        setEditingReplyId(null);
        setEditReplyText("");
      } catch (error) {
        console.error("Failed to update reply:", error);
      }
    }
  };

  const handleCancelReplyEdit = () => {
    setEditingReplyId(null);
    setEditReplyText("");
  };

  const toggleRepliesVisibility = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleMenu = (id, event) => {
    event.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
    setOpenReplyMenuId(null); // Close any open reply menu
  };

  const toggleReplyMenu = (id, event) => {
    event.stopPropagation();
    setOpenReplyMenuId(openReplyMenuId === id ? null : id);
    setOpenMenuId(null); // Close any open comment menu
  };

  return (
    <div className="mt-3">
      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-4 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="relative">
              {/* Main comment */}
              <div className="group">
                <div className="flex items-start">
                  <CommentAvatar
                    avatar={comment.avatar}
                    username={comment.username}
                  />
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="font-medium text-sm text-gray-800">
                        {comment.username}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.timestamp), {
                          addSuffix: true,
                        })}
                        {comment.edited && (
                          <span className="ml-1">(edited)</span>
                        )}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <EditForm
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                        textareaRef={editTextRef}
                      />
                    ) : (
                      <p className="text-sm text-gray-700 mt-1">
                        {comment.text}
                      </p>
                    )}
                  </div>

                  {editingCommentId !== comment.id &&
                    comment.userId === currentUser?._id && (
                      <div className="relative">
                        <button
                          className="text-gray-400 hover:text-gray-600 p-1"
                          onClick={(e) => toggleMenu(comment.id, e)}
                        >
                          <MoreVertical size={16} />
                        </button>

                        <ActionMenu
                          isOpen={openMenuId === comment.id}
                          menuRef={(el) =>
                            (dropdownRefs.current[`comment-${comment.id}`] = el)
                          }
                          onEdit={() => handleStartEditing(comment)}
                          onDelete={() => handleRemoveComment(comment.id)}
                        />
                      </div>
                    )}
                </div>
              </div>

              {/* Reply button below comment */}
              {editingCommentId !== comment.id && (
                <div className="mt-2 ml-11">
                  <button
                    className="text-gray-500 hover:text-[#4D2D61] text-sm"
                    onClick={() => handleReplyToComment(comment.id)}
                  >
                    Reply
                  </button>
                </div>
              )}

              {/* Reply form */}
              {replyingToId === comment.id && (
                <div className="mt-2 ml-11">
                  <div className="flex items-start">
                    <CommentAvatar
                      avatar={currentUser?.avatar}
                      username={currentUser?.firstName}
                      size="small"
                    />
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                        <textarea
                          ref={replyTextRef}
                          className="flex-grow border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] min-h-[35px] max-h-[85px] resize-none overflow-auto"
                          placeholder="Send a message"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                              handleAddReply(comment.id);
                            }
                            if (e.key === "Escape") {
                              setReplyingToId(null);
                            }
                          }}
                        />
                        <button
                          className={`p-1.5 rounded-md bg-[#4D2D61] ${
                            replyText.trim() ? "opacity-100" : "opacity-70"
                          }`}
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyText.trim() || commentsLoading}
                        >
                          <Send size={12} className="text-white" />
                        </button>
                        <button
                          className="p-1.5 rounded-md bg-gray-200 text-gray-600"
                          onClick={() => setReplyingToId(null)}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Press Ctrl+Enter to send
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies section */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2 ml-6">
                  <button
                    className="ml-2 text-xs text-[#4D2D61] font-medium flex items-center"
                    onClick={() => toggleRepliesVisibility(comment.id)}
                  >
                    {expandedComments[comment.id] ? (
                      <>
                        <ChevronUp size={14} className="mr-1" />
                        Hide {comment.replies.length}{" "}
                        {comment.replies.length === 1 ? "reply" : "replies"}
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} className="mr-1" />
                        Show {comment.replies.length}{" "}
                        {comment.replies.length === 1 ? "reply" : "replies"}
                      </>
                    )}
                  </button>

                  {expandedComments[comment.id] && (
                    <div className="mt-2 space-y-3">
                      {comment.replies.map((reply) => (
                        <div
                          key={reply.id}
                          className="pl-5 border-l-2 border-gray-200 ml-5 group"
                        >
                          <div className="flex items-start">
                            <CommentAvatar
                              avatar={reply.avatar}
                              username={reply.username}
                              size="small"
                            />
                            <div className="flex-grow">
                              <div className="flex items-center">
                                <span className="font-medium text-xs text-gray-800">
                                  {reply.username}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {formatDistanceToNow(
                                    new Date(reply.timestamp),
                                    { addSuffix: true }
                                  )}
                                  {reply.edited && (
                                    <span className="ml-1">(edited)</span>
                                  )}
                                </span>
                              </div>

                              {editingReplyId === reply.id ? (
                                <EditForm
                                  value={editReplyText}
                                  onChange={(e) =>
                                    setEditReplyText(e.target.value)
                                  }
                                  onSave={handleSaveReplyEdit}
                                  onCancel={handleCancelReplyEdit}
                                  textareaRef={editReplyTextRef}
                                  size="small"
                                />
                              ) : (
                                <p className="text-xs text-gray-700 mt-1">
                                  {reply.text}
                                </p>
                              )}
                            </div>

                            {reply.userId === currentUser?._id &&
                              editingReplyId !== reply.id && (
                                <div className="relative">
                                  <button
                                    className="text-gray-400 hover:text-gray-600 p-1"
                                    onClick={(e) =>
                                      toggleReplyMenu(reply.id, e)
                                    }
                                  >
                                    <MoreVertical size={14} />
                                  </button>

                                  <ActionMenu
                                    isOpen={openReplyMenuId === reply.id}
                                    menuRef={(el) =>
                                      (dropdownRefs.current[
                                        `reply-${reply.id}`
                                      ] = el)
                                    }
                                    onEdit={() =>
                                      handleStartEditingReply(comment.id, reply)
                                    }
                                    onDelete={() =>
                                      handleRemoveReply(comment.id, reply.id)
                                    }
                                    size="small"
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          {commentsLoading ? (
            <span>Loading comments...</span>
          ) : commentsError ? (
            <span className="text-red-500">Error: {commentsError}</span>
          ) : (
            <span>No comments yet. Be the first to comment!</span>
          )}
        </div>
      )}

      {/* Add new comment form */}
      <div className="flex items-start mt-4">
        <CommentAvatar
          avatar={currentUser?.avatar}
          username={currentUser?.firstName}
        />
        <div className="flex-grow flex items-center space-x-2">
          <textarea
            ref={newCommentRef}
            className="flex-grow border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] min-h-[40px] max-h-[85px] resize-none overflow-auto"
            placeholder="Send a message"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleAddComment();
              }
            }}
          />
          <button
            className={`p-2 rounded-md bg-[#4D2D61] ${
              newCommentText.trim() && !commentsLoading
                ? "opacity-100"
                : "opacity-70"
            }`}
            onClick={handleAddComment}
            disabled={!newCommentText.trim() || commentsLoading || !cardId}
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 ml-11">
        Press Ctrl+Enter to send
      </div>
    </div>
  );
}

// Reusable Avatar component for CardComments.jsx
const CommentAvatar = ({ avatar, username, size = "normal" }) => {
  const wrapperSize = size === "small" ? "w-6 h-6" : "w-8 h-8";
  const iconSize = size === "small" ? 12 : 16;
  const textSize = size === "small" ? "text-xs" : "text-base";

  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "";

  return (
    <div
      className={`${wrapperSize} rounded-full bg-purple-200 flex items-center justify-center mr-3 flex-shrink-0`}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={username}
          className="w-full h-full rounded-full object-cover"
        />
      ) : username ? (
        <span className={`font-semibold text-[#4D2D61] ${textSize}`}>
          {getInitials(username)}
        </span>
      ) : (
        <User size={iconSize} className="text-[#4D2D61]" />
      )}
    </div>
  );
};

// Reusable dropdown menu component
const ActionMenu = ({ isOpen, menuRef, onEdit, onDelete, size = "normal" }) => {
  const iconSize = size === "small" ? 12 : 14;
  const textSize = size === "small" ? "text-xs" : "text-sm";

  return isOpen ? (
    <div
      ref={menuRef}
      className="absolute right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-10 w-32"
    >
      <ul>
        <li
          className={`px-4 py-2 ${textSize} text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer`}
          onClick={onEdit}
        >
          <Edit2 size={iconSize} className="mr-2 text-blue-500" />
          Edit
        </li>
        <li
          className={`px-4 py-2 ${textSize} text-gray-700 hover:bg-gray-100 flex items-center cursor-pointer`}
          onClick={onDelete}
        >
          <Trash2 size={iconSize} className="mr-2 text-red-500" />
          Delete
        </li>
      </ul>
    </div>
  ) : null;
};

// Reusable edit form component
const EditForm = ({
  value,
  onChange,
  onSave,
  onCancel,
  textareaRef,
  size = "normal",
}) => {
  const iconSize = size === "small" ? 12 : 14;
  const minHeight = size === "small" ? "min-h-[35px]" : "min-h-[40px]";

  return (
    <div className="mt-1">
      <div className="flex items-center space-x-2">
        <textarea
          ref={textareaRef}
          className={`flex-grow border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4D2D61] focus:border-[#4D2D61] ${minHeight} max-h-[85px] resize-none overflow-auto`}
          value={value}
          onChange={onChange}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
        <button
          className="p-1.5 rounded-md bg-[#4D2D61] text-white"
          onClick={onSave}
        >
          <Save size={iconSize} />
        </button>
        <button
          className="p-1.5 rounded-md bg-gray-200 text-gray-600"
          onClick={onCancel}
        >
          <X size={iconSize} />
        </button>
      </div>
      <div className="mt-1 text-xs text-gray-500">Press Ctrl+Enter to save</div>
    </div>
  );
};
