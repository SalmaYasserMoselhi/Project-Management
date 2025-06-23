import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = ""; // سيتم استخدام الإعدادات الافتراضية في axiosConfig.js

// Async thunks لللتعامل مع API

// جلب بيانات البطاقة
export const fetchCardDetails = createAsyncThunk(
  "card/fetchCardDetails",
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/v1/cards/${cardId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch card details"
      );
    }
  }
);

// حفظ البطاقة (إنشاء أو تحديث)
export const saveCard = createAsyncThunk(
  "card/saveCard",
  async (
    { cardId, cardData, pendingFiles = [], originalListId = null },
    { dispatch, rejectWithValue }
  ) => {
    // التحقق من وجود listId صالح
    if (!cardData.listId) {
      return rejectWithValue("A valid list ID is required");
    }

    // التحقق من وجود عنوان للبطاقة
    if (
      !cardData.title ||
      cardData.title.trim() === "" ||
      cardData.title === "Card name"
    ) {
      return rejectWithValue("Card title is required");
    }

    try {
      let response;
      let savedCardId;

      // Check if this is an existing card and the list has changed
      const isMovingList =
        cardId && originalListId && originalListId !== cardData.listId;

      if (cardId) {
        // تحديث بطاقة موجودة
        // console.log(`Updating card ${cardId}`);

        // نسخ البيانات وتغيير listId إلى list للباكند
        const backendData = { ...cardData };

        // If we're moving the card to a different list, we need to use the move endpoint
        if (isMovingList) {
          // First update the card details without the list change
          delete backendData.listId;

          // Update the card details
          response = await axios.patch(
            `${BASE_URL}/api/v1/cards/${cardId}`,
            backendData
          );

          savedCardId =
            response.data.data.card._id || response.data.data.card.id || cardId;

          // Then move the card to the new list using the dedicated endpoint
          const moveResponse = await axios.patch(
            `${BASE_URL}/api/v1/cards/${cardId}/move`,
            {
              listId: cardData.listId,
              position: Date.now(), // Use timestamp to ensure unique, increasing position values
            }
          );

          // Update the response with the moved card data
          response = moveResponse;
        } else {
          // Normal update without list change
          backendData.list = backendData.listId;
          delete backendData.listId;

          response = await axios.patch(
            `${BASE_URL}/api/v1/cards/${cardId}`,
            backendData
          );

          savedCardId =
            response.data.data.card._id || response.data.data.card.id || cardId;
        }
      } else {
        // إنشاء بطاقة جديدة
        // console.log(`Creating new card in list ${cardData.listId}`);

        // نسخ البيانات وتغيير listId إلى list للباكند
        const backendData = { ...cardData };
        backendData.list = backendData.listId;
        delete backendData.listId;

        // استخدام المسار الصحيح للبطاقات وفقا لما هو مسجل في الباكند
        response = await axios.post(`${BASE_URL}/api/v1/cards`, backendData);
        savedCardId = response.data.data.card._id || response.data.data.card.id;
      }

      console.log("Card saved successfully:", response.data);

      // رفع الملفات المعلقة بعد حفظ البطاقة إذا كانت موجودة
      if (pendingFiles && pendingFiles.length > 0 && savedCardId) {
        // console.log(
        //   `Uploading ${pendingFiles.length} pending files for card ${savedCardId}`
        // );
        try {
          await dispatch(
            uploadAttachments({
              cardId: savedCardId,
              files: pendingFiles,
            })
          ).unwrap();
          // console.log("Pending files uploaded successfully");
        } catch (err) {
          console.error("Error uploading pending files after card save:", err);
        }
      }

      return response.data.data;
    } catch (error) {
      // تحسين رسائل الخطأ وتنسيقها
      console.error(
        "Error saving card:",
        error.response?.data || error.message
      );
      if (error.response && error.response.data) {
        if (error.response.status === 401) {
          return rejectWithValue(
            "You are not logged in! Please log in to get access."
          );
        }
        return rejectWithValue(
          error.response.data.message || "Failed to save card"
        );
      }
      return rejectWithValue("Network error. Please check your connection.");
    }
  }
);

// تحديث عنوان البطاقة فقط
export const updateCardTitle = createAsyncThunk(
  "card/updateCardTitle",
  async ({ cardId, title }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${BASE_URL}/api/v1/cards/${cardId}`, {
        title,
      });
      return { title: response.data.data.title };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update title");
    }
  }
);

// تحديث قائمة البطاقة
export const updateCardList = createAsyncThunk(
  "card/updateCardList",
  async ({ cardId, listId }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${BASE_URL}/api/v1/cards/${cardId}`, {
        listId,
      });
      return { listId: response.data.data.listId };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update list");
    }
  }
);

// تحديث تاريخ الاستحقاق
export const updateCardDueDate = createAsyncThunk(
  "card/updateCardDueDate",
  async ({ cardId, dueDate }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${BASE_URL}/api/v1/cards/${cardId}`, {
        dueDate,
      });
      return { dueDate: response.data.data.dueDate };
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to update due date"
      );
    }
  }
);

// تحديث الأولوية
export const updateCardPriority = createAsyncThunk(
  "card/updateCardPriority",
  async ({ cardId, priority }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/priority`,
        {
          priority,
        }
      );
      return response.data.data.card;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update priority"
      );
    }
  }
);

// جلب المهام الفرعية للبطاقة
export const fetchCardSubtasks = createAsyncThunk(
  "card/fetchCardSubtasks",
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/cards/${cardId}/subtasks`
      );
      return response.data.data.subtasks;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch subtasks"
      );
    }
  }
);

// إضافة مهمة فرعية جديدة
export const addCardSubtask = createAsyncThunk(
  "card/addCardSubtask",
  async ({ cardId, title }, { rejectWithValue }) => {
    if (!title || !title.trim()) {
      return rejectWithValue("Subtask title is required");
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/cards/${cardId}/subtasks`,
        {
          title: title.trim(), // تأكد من إرسال عنوان منظف
        }
      );
      return response.data.data.subtask;
    } catch (error) {
      console.error("API Error adding subtask:", error.response?.data || error);

      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue("Failed to add subtask. Please try again.");
    }
  }
);

// تبديل حالة الإكمال للمهمة الفرعية
export const toggleCardSubtask = createAsyncThunk(
  "card/toggleCardSubtask",
  async ({ cardId, subtaskId }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/subtasks/${subtaskId}/toggle`
      );
      return response.data.data.subtask;
    } catch (error) {
      console.error(
        "API Error toggling subtask:",
        error.response?.data || error
      );

      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue(
        "Failed to toggle subtask completion. Please try again."
      );
    }
  }
);

// حذف مهمة فرعية
export const deleteCardSubtask = createAsyncThunk(
  "card/deleteCardSubtask",
  async ({ cardId, subtaskId }, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${BASE_URL}/api/v1/cards/${cardId}/subtasks/${subtaskId}`
      );
      return { subtaskId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete subtask"
      );
    }
  }
);

// الحالة الابتدائية مع الهيكل الجديد لتاريخ الاستحقاق
const today = new Date();
const defaultEndDate = new Date(today);
defaultEndDate.setDate(today.getDate() + 7); // تاريخ استحقاق افتراضي بعد أسبوع

const formatDateForAPI = (date) => {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// إضافة ليبل جديد للبطاقة
export const addCardLabel = createAsyncThunk(
  "card/addCardLabel",
  async ({ cardId, labelData }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/cards/${cardId}/labels`,
        labelData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to add label");
    }
  }
);

// تحديث ليبل موجود
export const updateCardLabel = createAsyncThunk(
  "card/updateCardLabel",
  async ({ cardId, labelId, labelData }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/labels/${labelId}`,
        labelData
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to update label");
    }
  }
);

// حذف ليبل من البطاقة
export const deleteCardLabel = createAsyncThunk(
  "card/deleteCardLabel",
  async ({ cardId, labelId }, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${BASE_URL}/api/v1/cards/${cardId}/labels/${labelId}`
      );
      return { labelId };
    } catch (error) {
      return rejectWithValue(error.response?.data || "Failed to delete label");
    }
  }
);

// رفع مرفق (ملف) للبطاقة
export const uploadAttachments = createAsyncThunk(
  "card/uploadAttachments",
  async ({ cardId, files }, { rejectWithValue }) => {
    if (!cardId) {
      return rejectWithValue("Cannot upload files without a valid card ID");
    }

    try {
      // إنشاء نموذج بيانات للرفع
      const formData = new FormData();

      // إضافة معلومات الكيان
      formData.append("entityType", "card");
      formData.append("entityId", cardId);

      // إضافة الملفات
      if (Array.isArray(files)) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      } else {
        formData.append("files", files);
      }

      // console.log(
      //   `Uploading attachments for card ${cardId}, file count: ${
      //     Array.isArray(files) ? files.length : 1
      //   }`
      // );

      // استخدام نقطة نهاية PATCH للبطاقة لرفع المرفقات لأنها تستخدم attachmentController.uploadAttachments كوسيط
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // نعود بيانات الملفات المرفوعة إذا كانت موجودة في الاستجابة
      return response.data.data.files || [];
    } catch (error) {
      console.error("Error uploading attachments:", error);

      let errorMessage = "Failed to upload attachments";

      if (error.response) {
        if (error.response.status === 404) {
          errorMessage =
            "Card not found. Please save the card first before uploading attachments.";
        } else if (error.response.status === 401) {
          errorMessage =
            "You are not logged in! Please log in to upload attachments.";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);

// حذف مرفق من البطاقة
export const deleteAttachment = createAsyncThunk(
  "card/deleteAttachment",
  async ({ cardId, attachmentId }, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${BASE_URL}/api/v1/cards/${cardId}/attachments/${attachmentId}`
      );
      return { attachmentId };
    } catch (error) {
      console.error("Error deleting attachment:", error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete attachment"
      );
    }
  }
);

// جلب تعليقات البطاقة
export const fetchCardComments = createAsyncThunk(
  "card/fetchCardComments",
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/cards/${cardId}/comments`
      );
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch comments"
      );
    }
  }
);

// إضافة تعليق جديد للبطاقة
export const addCardComment = createAsyncThunk(
  "card/addCardComment",
  async ({ cardId, text }, { rejectWithValue }) => {
    if (!text || !text.trim()) {
      return rejectWithValue("Comment text is required");
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/cards/${cardId}/comments`,
        {
          text: text.trim(),
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("API Error adding comment:", error.response?.data || error);

      if (error.response?.data?.message) {
        return rejectWithValue(error.response.data.message);
      }
      return rejectWithValue("Failed to add comment. Please try again.");
    }
  }
);

// حذف تعليق أو رد
export const deleteCardComment = createAsyncThunk(
  "card/deleteCardComment",
  async ({ cardId, commentId, parentId }, { rejectWithValue }) => {
    try {
      // The same endpoint is used for comments and replies
      await axios.delete(
        `${BASE_URL}/api/v1/cards/${cardId}/comments/${commentId}`
      );
      return { commentId, parentId }; // Pass identifiers to the reducer
    } catch (error) {
      console.error(
        "API Error deleting comment:",
        error.response?.data || error
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete comment."
      );
    }
  }
);

// تحديث تعليق
export const updateCardComment = createAsyncThunk(
  "card/updateCardComment",
  async ({ cardId, commentId, text }, { rejectWithValue }) => {
    if (!text || !text.trim()) {
      return rejectWithValue("Comment text cannot be empty");
    }

    try {
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/comments/${commentId}`,
        { text: text.trim() }
      );
      return response.data.data.comment;
    } catch (error) {
      console.error(
        "API Error updating comment:",
        error.response?.data || error
      );
      return rejectWithValue(
        error.response?.data?.message || "Failed to update comment."
      );
    }
  }
);

// تحديث رد
export const updateCardReply = createAsyncThunk(
  "card/updateCardReply",
  async ({ cardId, replyId, text }, { rejectWithValue }) => {
    if (!text || !text.trim()) {
      return rejectWithValue("Reply text cannot be empty");
    }
    try {
      // The endpoint for updating a reply is the same as for a comment
      const response = await axios.patch(
        `${BASE_URL}/api/v1/cards/${cardId}/comments/${replyId}`,
        { text: text.trim() }
      );
      // We need to return the parent comment ID to find it in the reducer
      return {
        commentId: response.data.data.comment.parentId,
        updatedReply: response.data.data.comment,
      };
    } catch (error) {
      console.error("API Error updating reply:", error.response?.data || error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to update reply."
      );
    }
  }
);

// إضافة رد على تعليق
export const addReplyToComment = createAsyncThunk(
  "card/addReplyToComment",
  async ({ cardId, commentId, text }, { rejectWithValue }) => {
    if (!text || !text.trim()) {
      return rejectWithValue("Reply text is required");
    }

    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/cards/${cardId}/comments/${commentId}/reply`,
        { text: text.trim() }
      );
      return { commentId, reply: response.data.data.reply };
    } catch (error) {
      console.error("API Error adding reply:", error.response?.data || error);
      return rejectWithValue(
        error.response?.data?.message || "Failed to add reply."
      );
    }
  }
);

// Helper to calculate total comments
const calculateCommentsCount = (comments) => {
  if (!comments || !Array.isArray(comments)) return 0;
  return comments.reduce(
    (acc, comment) => acc + 1 + (comment.replies?.length || 0),
    0
  );
};

// جلب أعضاء البطاقة (المسندين)
export const fetchCardAssignees = createAsyncThunk(
  "card/fetchCardAssignees",
  async (cardId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/cards/${cardId}/members`
      );
      return response.data.data.members;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch card assignees"
      );
    }
  }
);

// إضافة عضو للبطاقة
export const addCardAssignee = createAsyncThunk(
  "card/addCardAssignee",
  async ({ cardId, userId }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${BASE_URL}/api/v1/cards/${cardId}/members`,
        {
          userId,
        }
      );
      return response.data.data.members;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to add assignee"
      );
    }
  }
);

// إزالة عضو من البطاقة
export const removeCardAssignee = createAsyncThunk(
  "card/removeCardAssignee",
  async ({ cardId, userId }, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${BASE_URL}/api/v1/cards/${cardId}/members/${userId}`
      );
      return { userId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to remove assignee"
      );
    }
  }
);

// تحديث المسندين بشكل جماعي
export const updateCardAssignees = createAsyncThunk(
  "card/updateCardAssignees",
  async ({ cardId, assigneeChanges }, { dispatch, rejectWithValue }) => {
    try {
      const results = [];

      // Process all changes
      for (const change of assigneeChanges) {
        const { userId, action } = change; // action can be 'add' or 'remove'

        if (action === "add") {
          const result = await dispatch(
            addCardAssignee({ cardId, userId })
          ).unwrap();
          results.push({ userId, action, result });
        } else if (action === "remove") {
          const result = await dispatch(
            removeCardAssignee({ cardId, userId })
          ).unwrap();
          results.push({ userId, action, result });
        }
      }

      return results;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update assignees"
      );
    }
  }
);

// جلب أعضاء البورد
export const fetchBoardMembers = createAsyncThunk(
  "card/fetchBoardMembers",
  async (boardId, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/v1/boards/${boardId}/members?limit=100`
      );
      return response.data.data.members;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch board members"
      );
    }
  }
);

// إضافة عضو للبطاقة (معلق)
export const addPendingAssignee = createAsyncThunk(
  "card/addPendingAssignee",
  async ({ userId }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentPendingAssignees = state.cardDetails.pendingAssignees || [];
      const currentAssignees = state.cardDetails.assignees || [];

      // Check if user is already assigned
      const isAlreadyAssigned = currentAssignees.some((assignee) => {
        const assigneeId = assignee.user?._id || assignee._id || assignee.id;
        return assigneeId === userId;
      });

      if (isAlreadyAssigned) {
        return rejectWithValue("User is already assigned to this card");
      }

      // Find user data from board members
      const boardMembers = state.cardDetails.boardMembers || [];
      const userData = boardMembers.find((member) => {
        const memberId = member.user?._id || member._id || member.id;
        return memberId === userId;
      });

      if (!userData) {
        return rejectWithValue("User not found in board members");
      }

      // Add to pending assignees
      const newPendingAssignee = {
        id: userData.user?._id || userData._id || userData.id,
        user: userData.user || userData,
        isPending: true,
      };

      return newPendingAssignee;
    } catch (error) {
      return rejectWithValue("Failed to add pending assignee");
    }
  }
);

// إزالة عضو من البطاقة (معلق)
export const removePendingAssignee = createAsyncThunk(
  "card/removePendingAssignee",
  async ({ userId }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentAssignees = state.cardDetails.assignees || [];
      const currentPendingAssignees = state.cardDetails.pendingAssignees || [];

      // Check if user is currently assigned
      const isCurrentlyAssigned = currentAssignees.some((assignee) => {
        const assigneeId = assignee.user?._id || assignee._id || assignee.id;
        return assigneeId === userId;
      });

      // Check if user is in pending assignees
      const isPending = currentPendingAssignees.some((assignee) => {
        const assigneeId = assignee.user?._id || assignee._id || assignee.id;
        return assigneeId === userId;
      });

      if (!isCurrentlyAssigned && !isPending) {
        return rejectWithValue("User is not assigned to this card");
      }

      return { userId, isCurrentlyAssigned, isPending };
    } catch (error) {
      return rejectWithValue("Failed to remove pending assignee");
    }
  }
);

// حفظ المسندين المعلقة إلى الباكند
export const savePendingAssignees = createAsyncThunk(
  "card/savePendingAssignees",
  async ({ cardId }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const currentAssignees = state.cardDetails.assignees || [];
      const pendingAssignees = state.cardDetails.pendingAssignees || [];

      const results = [];

      // Process all pending additions
      for (const pendingAssignee of pendingAssignees) {
        const userId =
          pendingAssignee.user?._id ||
          pendingAssignee._id ||
          pendingAssignee.id;

        // Check if this user is not already assigned
        const isCurrentlyAssigned = currentAssignees.some((assignee) => {
          const assigneeId = assignee.user?._id || assignee._id || assignee.id;
          return assigneeId === userId;
        });

        if (!isCurrentlyAssigned) {
          // This is a new assignment
          const result = await dispatch(
            addCardAssignee({ cardId, userId })
          ).unwrap();
          results.push({ userId, action: "add", result });
        }
      }

      // Check for removals (assignees that were in original state but not in current + pending)
      const originalAssignees = state.cardDetails.assignees || [];
      const allCurrentAssignees = [...currentAssignees, ...pendingAssignees];

      for (const originalAssignee of originalAssignees) {
        const originalUserId =
          originalAssignee.user?._id ||
          originalAssignee._id ||
          originalAssignee.id;

        const stillAssigned = allCurrentAssignees.some((assignee) => {
          const assigneeId = assignee.user?._id || assignee._id || assignee.id;
          return assigneeId === originalUserId;
        });

        if (!stillAssigned) {
          // This assignee was removed
          const result = await dispatch(
            removeCardAssignee({ cardId, userId: originalUserId })
          ).unwrap();
          results.push({ userId: originalUserId, action: "remove", result });
        }
      }

      return results;
    } catch (error) {
      return rejectWithValue("Failed to save pending assignees");
    }
  }
);

const initialState = {
  id: null,
  title: "",
  dueDate: {
    startDate: formatDateForAPI(today),
    endDate: formatDateForAPI(defaultEndDate),
  },
  labels: [],
  priority: "medium",
  description: "",
  attachments: [],
  subtasks: [],
  comments: [],
  listId: null,
  boardId: null,
  assignees: [], // إضافة المسندين
  pendingAssignees: [], // إضافة المسندين المعلقة
  boardMembers: [], // إضافة أعضاء البورد
  loading: false,
  saveLoading: false,
  commentsLoading: false,
  assigneesLoading: false, // حالة تحميل المسندين
  boardMembersLoading: false, // حالة تحميل أعضاء البورد
  error: null,
  saveError: null,
  commentsError: null,
  assigneesError: null, // خطأ المسندين
  boardMembersError: null, // خطأ أعضاء البورد
  commentsCount: 0,
};

const cardDetailsSlice = createSlice({
  name: "cardDetails",
  initialState,
  reducers: {
    updateTitle: (state, action) => {
      state.title = action.payload;
    },
    updateDueDate: (state, action) => {
      state.dueDate = action.payload;
    },
    addLabel: (state, action) => {
      state.labels.push(action.payload);
    },
    updateLabel: (state, action) => {
      const { index, name, color } = action.payload;
      if (state.labels[index]) {
        state.labels[index] = { name, color };
      }
    },
    removeLabel: (state, action) => {
      state.labels.splice(action.payload, 1);
    },
    updatePriority: (state, action) => {
      state.priority = action.payload;
    },
    updateDescription: (state, action) => {
      state.description = action.payload;
    },
    updateListId: (state, action) => {
      state.listId = action.payload;
    },
    setBoardId: (state, action) => {
      state.boardId = action.payload;
    },
    addAttachment: (state, action) => {
      state.attachments.push(action.payload);
    },
    removeAttachment: (state, action) => {
      state.attachments = state.attachments.filter(
        (attachment) => attachment.id !== action.payload
      );
    },
    addSubtask: (state, action) => {
      state.subtasks.push(action.payload);
    },
    toggleSubtask: (state, action) => {
      const taskId = action.payload;
      const task = state.subtasks.find(
        (task) => task._id === taskId || task.id === taskId
      );
      if (task) {
        // في API يسمى isCompleted، بينما في واجهة المستخدم يسمى completed
        if ("isCompleted" in task) {
          task.isCompleted = !task.isCompleted;
        } else {
          task.completed = !task.completed;
        }
      }
    },
    removeSubtask: (state, action) => {
      const taskId = action.payload;
      state.subtasks = state.subtasks.filter(
        (task) => task._id !== taskId && task.id !== taskId
      );
    },
    addComment: (state, action) => {
      state.comments.push(action.payload);
    },
    removeComment: (state, action) => {
      const commentId = action.payload;
      state.comments = state.comments.filter(
        (comment) => comment.id !== commentId
      );
    },
    editComment: (state, action) => {
      const { id, text } = action.payload;
      const comment = state.comments.find((comment) => comment.id === id);
      if (comment) {
        comment.text = text;
        comment.edited = true;
      }
    },
    addReply: (state, action) => {
      const { commentId, reply } = action.payload;
      const comment = state.comments.find(
        (comment) => comment.id === commentId
      );
      if (comment) {
        if (!comment.replies) {
          comment.replies = [];
        }
        comment.replies.push(reply);
      }
    },
    removeReply: (state, action) => {
      const { commentId, replyId } = action.payload;
      const comment = state.comments.find(
        (comment) => comment.id === commentId
      );
      if (comment && comment.replies) {
        comment.replies = comment.replies.filter(
          (reply) => reply.id !== replyId
        );
      }
    },
    editReply: (state, action) => {
      const { commentId, replyId, text } = action.payload;
      const comment = state.comments.find(
        (comment) => comment.id === commentId
      );
      if (comment && comment.replies) {
        const reply = comment.replies.find((reply) => reply.id === replyId);
        if (reply) {
          reply.text = text;
          reply.edited = true;
        }
      }
    },
    setSaveError: (state, action) => {
      state.saveError = action.payload;
    },
    resetCardDetails: () => initialState,
    // إضافة reducer للمسندين
    setAssignees: (state, action) => {
      state.assignees = action.payload;
    },

    // إضافة reducer لأعضاء البورد
    setBoardMembers: (state, action) => {
      state.boardMembers = action.payload;
    },

    // إضافة reducer لإعادة تعيين المسندين فقط
    resetAssignees: (state) => {
      state.assignees = [];
      state.assigneesLoading = false;
      state.assigneesError = null;
    },

    // إضافة reducer لإعادة تعيين أعضاء البورد فقط
    resetBoardMembers: (state) => {
      state.boardMembers = [];
      state.boardMembersLoading = false;
      state.boardMembersError = null;
    },

    // إضافة reducer لإعادة تعيين المسندين إلى الحالة الأولية
    revertAssignees: (state, action) => {
      state.assignees = action.payload;
      state.assigneesLoading = false;
      state.assigneesError = null;
    },

    // إضافة reducer لإعادة تعيين المسندين المعلقة
    resetPendingAssignees: (state) => {
      state.pendingAssignees = [];
      state.assigneesLoading = false;
      state.assigneesError = null;
    },

    // إضافة reducer لدمج المسندين المعلقة مع المسندين الحاليين
    mergePendingAssignees: (state) => {
      state.assignees = [...state.assignees, ...state.pendingAssignees];
      state.pendingAssignees = [];
    },
  },
  extraReducers: (builder) => {
    // معالجة جلب بيانات البطاقة
    builder
      .addCase(fetchCardDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCardDetails.fulfilled, (state, action) => {
        state.loading = false;
        // تحديث حالة البطاقة بالبيانات المجلوبة
        const cardData = action.payload.card;
        const attachmentsData = action.payload.attachments;

        // Store board ID if available
        if (action.payload.boardId) {
          state.boardId = action.payload.boardId;
        }

        // Handle assignees if they are part of the card data
        if (cardData.members && Array.isArray(cardData.members)) {
          state.assignees = cardData.members.map((member) => ({
            id: member.user?._id || member._id,
            user: member.user,
            assignedBy: member.assignedBy,
            assignedAt: member.assignedAt,
          }));
        }

        // Handle comments if they are part of the card data, ensuring consistent structure
        if (cardData.comments && Array.isArray(cardData.comments)) {
          state.comments = cardData.comments.map((comment) => ({
            id: comment._id,
            text: comment.text,
            author: comment.author,
            userId: comment.author?._id || comment.userId,
            avatar: comment.author?.avatar,
            username:
              `${comment.author?.firstName || ""} ${
                comment.author?.lastName || ""
              }`.trim() || "Anonymous",
            timestamp: comment.createdAt,
            edited: comment.edited?.isEdited === true,
            replies: (comment.replies || []).map((reply) => ({
              id: reply._id,
              text: reply.text,
              author: reply.author,
              userId: reply.author?._id || reply.userId,
              avatar: reply.author?.avatar,
              username:
                `${reply.author?.firstName || ""} ${
                  reply.author?.lastName || ""
                }`.trim() || "Anonymous",
              timestamp: reply.createdAt,
              edited: reply.edited?.isEdited === true,
            })),
          }));
        }

        state.commentsCount = calculateCommentsCount(state.comments);

        // التعامل بشكل خاص مع dueDate للتأكد من هيكل البيانات الصحيح
        if (cardData.dueDate) {
          if (
            typeof cardData.dueDate === "object" &&
            cardData.dueDate.endDate
          ) {
            state.dueDate = cardData.dueDate;
          } else {
            // إذا كان التاريخ بتنسيق مختلف، حاول تحويله إلى الهيكل المطلوب
            try {
              const endDate = new Date(cardData.dueDate);

              state.dueDate = {
                startDate: formatDateForAPI(new Date()), // دائمًا استخدم اليوم كتاريخ بداية
                endDate: formatDateForAPI(endDate),
              };
            } catch (e) {
              console.error("Error parsing due date:", e);
              // حافظ على القيمة الافتراضية
            }
          }
        }

        // تحديث المرفقات إذا كانت موجودة
        if (attachmentsData && Array.isArray(attachmentsData)) {
          state.attachments = attachmentsData.map((attachment) => ({
            id: attachment._id,
            name: attachment.originalName,
            size: attachment.formatSize
              ? attachment.formatSize
              : formatFileSize(attachment.size),
            url: attachment.url || attachment.filename,
            uploadDate: attachment.createdAt,
          }));
          console.log("Processed attachments:", state.attachments);
        } else {
          state.attachments = [];
        }

        // تحديث باقي الحقول
        Object.keys(cardData).forEach((key) => {
          if (
            key !== "dueDate" &&
            key !== "attachments" &&
            key !== "comments" && // Prevent overwriting our mapped comments
            key !== "members" && // Prevent overwriting our mapped assignees
            key in state
          ) {
            state[key] = cardData[key];
          }
        });

        state.id = cardData._id; // تخزين معرف البطاقة
      })
      .addCase(fetchCardDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch card details";
      })

      // معالجة حفظ البطاقة
      .addCase(saveCard.pending, (state) => {
        state.saveLoading = true;
        state.saveError = null;
      })
      .addCase(saveCard.fulfilled, (state, action) => {
        state.saveLoading = false;
        const cardData = action.payload;
        // تحديث معرف البطاقة في حالة البطاقة الجديدة
        if (cardData.id && !state.id) {
          state.id = cardData.id;
        }
      })
      .addCase(saveCard.rejected, (state, action) => {
        state.saveLoading = false;
        // Handle different error formats
        if (action.payload && typeof action.payload === "object") {
          // If it's an object with a message property
          if (action.payload.message) {
            state.saveError = action.payload.message;
          } else {
            state.saveError = "Failed to save card";
          }
        } else {
          state.saveError = action.payload || "Failed to save card";
        }
      })

      // معالجة تحديث عنوان البطاقة
      .addCase(updateCardTitle.fulfilled, (state, action) => {
        state.title = action.payload.title;
      })

      // معالجة تحديث قائمة البطاقة
      .addCase(updateCardList.fulfilled, (state, action) => {
        state.listId = action.payload.listId;
      })

      // معالجة تحديث تاريخ الاستحقاق
      .addCase(updateCardDueDate.pending, (state) => {
        // يمكن إضافة مؤشر تحميل خاص بالتاريخ إذا لزم الأمر
      })
      .addCase(updateCardDueDate.fulfilled, (state, action) => {
        state.dueDate = action.payload.dueDate;
      })
      .addCase(updateCardDueDate.rejected, (state, action) => {
        state.error = action.payload || "Failed to update due date";
      })

      // معالجة تحديث الأولوية
      .addCase(updateCardPriority.pending, (state) => {
        state.saveLoading = true;
        state.saveError = null;
      })
      .addCase(updateCardPriority.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.priority = action.payload.priority;
      })
      .addCase(updateCardPriority.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload || "Failed to update priority";
      })

      // معالجة جلب المهام الفرعية
      .addCase(fetchCardSubtasks.pending, (state) => {
        state.subtasksLoading = true;
        state.subtasksError = null;
      })
      .addCase(fetchCardSubtasks.fulfilled, (state, action) => {
        state.subtasksLoading = false;

        // تحويل البيانات من API لتتوافق مع هيكل واجهة المستخدم
        state.subtasks = action.payload.map((subtask) => ({
          id: subtask._id,
          _id: subtask._id, // احتفظ بالمعرف الأصلي من API
          text: subtask.title,
          title: subtask.title, // احتفظ بالعنوان الأصلي من API
          completed: subtask.isCompleted,
          isCompleted: subtask.isCompleted, // احتفظ بقيمة الإكمال الأصلية من API
          position: subtask.position,
          createdAt: subtask.createdAt,
          dueDate: subtask.dueDate,
          assignedTo: subtask.assignedTo,
        }));
      })
      .addCase(fetchCardSubtasks.rejected, (state, action) => {
        state.subtasksLoading = false;
        state.subtasksError = action.payload || "Failed to fetch subtasks";
      })

      // معالجة إضافة مهمة فرعية
      .addCase(addCardSubtask.pending, (state) => {
        state.subtasksLoading = true;
        state.subtasksError = null;
      })
      .addCase(addCardSubtask.fulfilled, (state, action) => {
        state.subtasksLoading = false;
        const subtask = action.payload;

        // تحويل الاستجابة للتوافق مع هيكل البيانات في واجهة المستخدم
        if (subtask && subtask._id) {
          state.subtasks.push({
            id: subtask._id,
            _id: subtask._id,
            text: subtask.title,
            title: subtask.title,
            completed: subtask.isCompleted,
            isCompleted: subtask.isCompleted,
            position: subtask.position,
            createdAt: subtask.createdAt,
            dueDate: subtask.dueDate,
            assignedTo: subtask.assignedTo,
          });
        }
      })
      .addCase(addCardSubtask.rejected, (state, action) => {
        state.subtasksLoading = false;
        state.subtasksError = action.payload || "Failed to add subtask";
      })

      // معالجة تبديل حالة المهمة الفرعية
      .addCase(toggleCardSubtask.pending, (state) => {
        // يمكن إضافة حالة تحميل للمهمة المحددة فقط إذا لزم الأمر
      })
      .addCase(toggleCardSubtask.fulfilled, (state, action) => {
        const subtask = action.payload;
        const index = state.subtasks.findIndex(
          (task) => task._id === subtask._id || task.id === subtask._id
        );

        if (index !== -1) {
          // تحديث المهمة في القائمة
          state.subtasks[index] = {
            ...state.subtasks[index],
            completed: subtask.isCompleted,
            isCompleted: subtask.isCompleted,
            // تحديث بيانات إضافية من API
            completedAt: subtask.completedAt,
            completedBy: subtask.completedBy,
          };
        }
      })
      .addCase(toggleCardSubtask.rejected, (state, action) => {
        state.subtasksError = action.payload || "Failed to toggle subtask";
      })

      // معالجة حذف المهمة الفرعية
      .addCase(deleteCardSubtask.pending, (state) => {
        // يمكن إضافة حالة تحميل للمهمة المحددة فقط إذا لزم الأمر
      })
      .addCase(deleteCardSubtask.fulfilled, (state, action) => {
        const { subtaskId } = action.payload;
        state.subtasks = state.subtasks.filter(
          (task) => task._id !== subtaskId && task.id !== subtaskId
        );
      })
      .addCase(deleteCardSubtask.rejected, (state, action) => {
        state.subtasksError = action.payload || "Failed to delete subtask";
      })

      .addCase(addCardLabel.pending, (state) => {
        state.saveLoading = true;
        state.saveError = null;
      })
      .addCase(addCardLabel.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.labels.push(action.payload);
      })
      .addCase(addCardLabel.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload || "Failed to add label";
      })

      .addCase(updateCardLabel.pending, (state) => {
        state.saveLoading = true;
        state.saveError = null;
      })
      .addCase(updateCardLabel.fulfilled, (state, action) => {
        state.saveLoading = false;
        const updatedLabel = action.payload;
        const index = state.labels.findIndex(
          (label) => label.id === updatedLabel.id
        );
        if (index !== -1) {
          state.labels[index] = updatedLabel;
        }
      })
      .addCase(updateCardLabel.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload || "Failed to update label";
      })

      .addCase(deleteCardLabel.pending, (state) => {
        state.saveLoading = true;
        state.saveError = null;
      })
      .addCase(deleteCardLabel.fulfilled, (state, action) => {
        state.saveLoading = false;
        state.labels = state.labels.filter(
          (label) => label.id !== action.payload.labelId
        );
      })
      .addCase(deleteCardLabel.rejected, (state, action) => {
        state.saveLoading = false;
        state.saveError = action.payload || "Failed to delete label";
      })

      // معالجة رفع المرفقات
      .addCase(uploadAttachments.pending, (state) => {
        state.uploadingAttachments = true;
        state.attachmentError = null;
      })
      .addCase(uploadAttachments.fulfilled, (state, action) => {
        state.uploadingAttachments = false;
        // إضافة المرفقات المرفوعة إلى القائمة
        if (Array.isArray(action.payload)) {
          action.payload.forEach((attachment) => {
            state.attachments.push({
              id: attachment.id,
              name: attachment.originalname || attachment.name,
              size: attachment.size,
              url: attachment.url || attachment.path,
              uploadDate: new Date().toISOString(),
            });
          });
        }
      })
      .addCase(uploadAttachments.rejected, (state, action) => {
        state.uploadingAttachments = false;
        state.attachmentError =
          action.payload || "Failed to upload attachments";
      })

      // معالجة حذف المرفقات
      .addCase(deleteAttachment.fulfilled, (state, action) => {
        state.attachments = state.attachments.filter(
          (attachment) => attachment.id !== action.payload.attachmentId
        );
      })

      // معالجة جلب التعليقات
      .addCase(fetchCardComments.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(fetchCardComments.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const commentsData = Array.isArray(action.payload)
          ? action.payload
          : action.payload.comments || [];

        state.comments = commentsData.map((comment) => ({
          id: comment._id,
          text: comment.text,
          author: comment.author,
          userId: comment.author?._id || comment.userId,
          avatar: comment.author?.avatar,
          username:
            `${comment.author?.firstName || ""} ${
              comment.author?.lastName || ""
            }`.trim() ||
            comment.author?.username ||
            "Anonymous",
          timestamp: comment.createdAt,
          edited: comment.edited?.isEdited === true,
          replies: (comment.replies || []).map((reply) => ({
            id: reply._id,
            text: reply.text,
            author: reply.author,
            userId: reply.author?._id || reply.userId,
            avatar: reply.author?.avatar,
            username:
              `${reply.author?.firstName || ""} ${
                reply.author?.lastName || ""
              }`.trim() ||
              reply.author?.username ||
              "Anonymous",
            timestamp: reply.createdAt,
            edited: reply.edited?.isEdited === true,
          })),
        }));
        state.commentsCount = calculateCommentsCount(state.comments);
      })
      .addCase(fetchCardComments.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to fetch comments";
      })

      // معالجة إضافة تعليق
      .addCase(addCardComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(addCardComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { comment } = action.payload;

        // تحويل الاستجابة للتوافق مع هيكل البيانات في واجهة المستخدم
        if (comment && comment._id) {
          const newComment = {
            id: comment._id,
            text: comment.text,
            author: comment.author,
            userId: comment.author?._id || comment.userId,
            avatar: comment.author?.avatar,
            username:
              `${comment.author?.firstName || ""} ${
                comment.author?.lastName || ""
              }`.trim() ||
              comment.author?.username ||
              "Anonymous",
            timestamp: comment.createdAt || new Date().toISOString(),
            edited: false,
            replies: (comment.replies || []).map((reply) => ({
              ...reply,
              id: reply._id,
              author: reply.author,
            })),
          };
          state.comments.unshift(newComment);
        }
        state.commentsCount = calculateCommentsCount(state.comments);
      })
      .addCase(addCardComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to add comment";
      })

      // معالجة حذف تعليق أو رد
      .addCase(deleteCardComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(deleteCardComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { commentId, parentId } = action.payload;

        if (parentId) {
          // This is a reply, so find the parent and filter it from the replies array
          const parentComment = state.comments.find(
            (comment) => comment.id === parentId
          );
          if (parentComment) {
            parentComment.replies = parentComment.replies.filter(
              (reply) => reply.id !== commentId
            );
          }
        } else {
          // This is a main comment, so filter it from the top-level comments array
          state.comments = state.comments.filter(
            (comment) => comment.id !== commentId
          );
        }
        state.commentsCount = calculateCommentsCount(state.comments);
      })
      .addCase(deleteCardComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to delete comment";
      })

      // معالجة تحديث تعليق
      .addCase(updateCardComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(updateCardComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const updatedComment = action.payload;
        const index = state.comments.findIndex(
          (comment) => comment.id === updatedComment._id
        );
        if (index !== -1) {
          state.comments[index].text = updatedComment.text;
          state.comments[index].edited = true;
          // Optionally update other fields if the API returns them
          state.comments[index].timestamp =
            updatedComment.edited?.editedAt || updatedComment.updatedAt;
        }
      })
      .addCase(updateCardComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to update comment";
      })

      // معالجة تحديث رد
      .addCase(updateCardReply.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(updateCardReply.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { commentId, updatedReply } = action.payload;

        const parentComment = state.comments.find(
          (comment) => comment.id === commentId
        );

        if (parentComment && parentComment.replies) {
          const replyIndex = parentComment.replies.findIndex(
            (reply) => reply.id === updatedReply._id
          );

          if (replyIndex !== -1) {
            parentComment.replies[replyIndex].text = updatedReply.text;
            parentComment.replies[replyIndex].edited = true;
            parentComment.replies[replyIndex].timestamp =
              updatedReply.edited?.editedAt || updatedReply.updatedAt;
          }
        }
      })
      .addCase(updateCardReply.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to update reply";
      })

      // معالجة إضافة رد
      .addCase(addReplyToComment.pending, (state) => {
        state.commentsLoading = true;
        state.commentsError = null;
      })
      .addCase(addReplyToComment.fulfilled, (state, action) => {
        state.commentsLoading = false;
        const { commentId, reply } = action.payload;

        const parentComment = state.comments.find(
          (comment) => comment.id === commentId
        );

        if (parentComment) {
          if (!parentComment.replies) {
            parentComment.replies = [];
          }
          parentComment.replies.push({
            id: reply._id,
            text: reply.text,
            author: reply.author,
            userId: reply.author?._id || reply.userId,
            avatar: reply.author?.avatar,
            username:
              `${reply.author?.firstName || ""} ${
                reply.author?.lastName || ""
              }`.trim() ||
              reply.author?.username ||
              "Anonymous",
            timestamp: reply.createdAt,
            edited: reply.edited?.isEdited === true,
          });
        }
        state.commentsCount = calculateCommentsCount(state.comments);
      })
      .addCase(addReplyToComment.rejected, (state, action) => {
        state.commentsLoading = false;
        state.commentsError = action.payload || "Failed to add reply";
      })

      // معالجة جلب المسندين
      .addCase(fetchCardAssignees.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(fetchCardAssignees.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        state.assignees = action.payload;
      })
      .addCase(fetchCardAssignees.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError = action.payload || "Failed to fetch assignees";
      })

      // معالجة إضافة مسند
      .addCase(addCardAssignee.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(addCardAssignee.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        state.assignees = action.payload;
      })
      .addCase(addCardAssignee.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError = action.payload || "Failed to add assignee";
      })

      // معالجة إزالة مسند
      .addCase(removeCardAssignee.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(removeCardAssignee.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        const { userId } = action.payload;
        state.assignees = state.assignees.filter((assignee) => {
          const assigneeId = assignee.user?._id || assignee._id || assignee.id;
          return assigneeId !== userId;
        });
      })
      .addCase(removeCardAssignee.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError = action.payload || "Failed to remove assignee";
      })

      // معالجة تحديث المسندين بشكل جماعي
      .addCase(updateCardAssignees.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(updateCardAssignees.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        // The individual add/remove actions will have already updated the state
        // This is just for handling the loading state
      })
      .addCase(updateCardAssignees.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError = action.payload || "Failed to update assignees";
      })

      // معالجة جلب أعضاء البورد
      .addCase(fetchBoardMembers.pending, (state) => {
        state.boardMembersLoading = true;
        state.boardMembersError = null;
      })
      .addCase(fetchBoardMembers.fulfilled, (state, action) => {
        state.boardMembersLoading = false;
        state.boardMembers = action.payload;
      })
      .addCase(fetchBoardMembers.rejected, (state, action) => {
        state.boardMembersLoading = false;
        state.boardMembersError =
          action.payload || "Failed to fetch board members";
      })

      // معالجة إضافة عضو معلق
      .addCase(addPendingAssignee.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(addPendingAssignee.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        state.pendingAssignees.push(action.payload);
      })
      .addCase(addPendingAssignee.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError =
          action.payload || "Failed to add pending assignee";
      })

      // معالجة إزالة عضو معلق
      .addCase(removePendingAssignee.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(removePendingAssignee.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        const { userId, isCurrentlyAssigned, isPending } = action.payload;

        if (isPending) {
          // Remove from pending assignees
          state.pendingAssignees = state.pendingAssignees.filter((assignee) => {
            const assigneeId =
              assignee.user?._id || assignee._id || assignee.id;
            return assigneeId !== userId;
          });
        }

        if (isCurrentlyAssigned) {
          // Remove from current assignees
          state.assignees = state.assignees.filter((assignee) => {
            const assigneeId =
              assignee.user?._id || assignee._id || assignee.id;
            return assigneeId !== userId;
          });
        }
      })
      .addCase(removePendingAssignee.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError =
          action.payload || "Failed to remove pending assignee";
      })

      // معالجة حفظ المسندين المعلقة
      .addCase(savePendingAssignees.pending, (state) => {
        state.assigneesLoading = true;
        state.assigneesError = null;
      })
      .addCase(savePendingAssignees.fulfilled, (state, action) => {
        state.assigneesLoading = false;
        // Clear pending assignees after successful save
        state.pendingAssignees = [];
        // The actual assignees will be updated by the individual add/remove actions
      })
      .addCase(savePendingAssignees.rejected, (state, action) => {
        state.assigneesLoading = false;
        state.assigneesError =
          action.payload || "Failed to save pending assignees";
      });
  },
});

export const {
  updateTitle,
  updateDueDate,
  addLabel,
  updateLabel,
  removeLabel,
  updatePriority,
  updateDescription,
  updateListId,
  setBoardId,
  addAttachment,
  removeAttachment,
  addSubtask,
  toggleSubtask,
  removeSubtask,
  addComment,
  removeComment,
  editComment,
  addReply,
  removeReply,
  editReply,
  setSaveError,
  resetCardDetails,
  setAssignees,
  setBoardMembers,
  resetAssignees,
  resetBoardMembers,
  revertAssignees,
  resetPendingAssignees,
  mergePendingAssignees,
} = cardDetailsSlice.actions;

export default cardDetailsSlice.reducer;

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return bytes + " bytes";
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / 1048576).toFixed(1) + " MB";
};
