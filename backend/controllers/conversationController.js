const Conversation = require('./../models/conversationModel.js');
const User = require('./../models/userModel.js');
const AppError = require('./../utils/appError.js');
const catchAsync = require('./../utils/catchAsync.js');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // MISSING IMPORT
const { v4: uuidv4 } = require('uuid'); // MISSING IMPORT
const { uploadSingleImage } = require('../Middlewares/fileUploadMiddleware');

// Add middleware for group image upload
exports.uploadGroupPicture = uploadSingleImage('picture');

exports.resizeUserAvatar = catchAsync(async (req, res, next) => {
  // Skip if no file was uploaded
  if (!req.file) {
    return next();
  }

  const GroupFileName = `group-${uuidv4()}-${Date.now()}.jpeg`;
  const uploadDir = path.join(process.cwd(), 'Uploads', 'group');

  // Ensure the directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, GroupFileName);

  try {
    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 98 })
      .toFile(filePath);

    // Save filename to request body for database storage
    req.body.picture = GroupFileName;
    next();
  } catch (error) {
    console.error('Error processing group image:', error);
    return next(new AppError('Error processing group image', 500));
  }
});

const populateConversation = async (id, fieldsToPopulate, fieldsToRemove) => {
  const populatedConvo = await Conversation.findOne({ _id: id }).populate(
    fieldsToPopulate,
    fieldsToRemove
  );
  if (!populatedConvo) {
    throw new AppError('Oops... something went wrong', 400);
  }
  return populatedConvo;
};
const doesConversationExist = async (senderId, receiverId, isGroup) => {
  if (isGroup === false) {
    let convos = await Conversation.find({
      isGroup: false,
      $and: [
        { users: { $elemMatch: { $eq: senderId } } },
        { users: { $elemMatch: { $eq: receiverId } } },
      ],
    })
      .populate('users', '-password')
      .populate('lastMessage');

    if (!convos || convos.length === 0) {
      return null;
    }

    // populate message model
    convos = await User.populate(convos, {
      path: 'lastMessage.sender',
      select: 'username email avatar',
    });

    return convos[0];
  } else {
    // it is a group chat
    let convo = await Conversation.find({ isGroup })
      .populate('users admin', '-password')
      .populate('lastMessage');

    if (!convo) {
      return null;
    }

    // populate message model
    convo = await User.populate(convo, {
      path: 'lastMessage.sender',
      select: 'username email avatar',
    });

    return convo;
  }
};

const createConversation = async (data) => {
  // Ensure data is valid before creating
  if (!data.name || data.name.trim() === '') {
    data.name = 'New Conversation'; // Ensure name always has a value
  }

  // Ensure users are properly converted to ObjectIds
  if (data.users && Array.isArray(data.users)) {
    data.users = data.users.map((userId) =>
      mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId
    );
  }

  if (!data.picture) {
    data.picture =
      process.env.DEFAULT_GROUP_PICTURE || '/uploads/default-group.png';
  }

  try {
    const newConvo = await Conversation.create(data);
    return newConvo;
  } catch (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
};

exports.createOpenConversation = catchAsync(async (req, res, next) => {
  const senderId = req.user._id;
  const { receiverId, isGroup } = req.body;
  if (isGroup == false) {
    // Check if receiverId is provided
    if (!receiverId) {
      return next(
        new AppError(
          'Please provide the user id you want to start a conversation with',
          400
        )
      );
    }

    // Ensure IDs are valid ObjectIds
    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return next(new AppError('Invalid user ID format', 400));
    }

    // Convert string IDs to ObjectIds
    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Check if the chat exists
    const existedConversation = await doesConversationExist(
      senderObjectId,
      receiverObjectId,
      false
    );
    if (existedConversation) {
      res.json(existedConversation);
    } else {
      let receiverUser = await User.findById(receiverObjectId);

      // Make sure receiverUser exists
      if (!receiverUser) {
        return next(new AppError('User not found', 404));
      }

      let convoData = {
        name:
          req.body.name ||
          req.body.conversationName ||
          receiverUser.username ||
          'Chat',
        picture:
          req.body.picture ||
          req.body.avatar ||
          receiverUser.avatar ||
          'conversation picture',
        isGroup: false,
        users: [senderObjectId, receiverObjectId],
      };

      const newConvo = await createConversation(convoData);
      if (!newConvo) {
        return next(new AppError('Failed to create conversation', 500));
      }

      res.status(200).json({
        status: 'success',
        data: {
          newConvo,
        },
      });
    }
  } else {
    // it is a group chat
    // check if group chat exist
    const existedGroupConversation = await doesConversationExist(
      '',
      '',
      isGroup
    );
    res.status(200).json({
      status: 'success',
      data: { existedGroupConversation },
    });
  }
});

const getUserConversation = async (userId) => {
  let conversations;
  await Conversation.find({
    users: { $elemMatch: { $eq: userId } },
  })
    .populate('users', '-password')
    .populate('admin', '-password')
    .populate('lastMessage')
    .sort({ updatedAt: -1 })
    .then(async (results) => {
      results = await User.populate(results, {
        path: 'lastMessage.sender',
        select: 'username email avatar',
      });
      conversations = results;
    })
    .catch((error) => {
      console.error('Something went wrong:', error);
      return null;
    });
  return conversations;
};

exports.getConversations = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const conversations = await getUserConversation(userId);
  res.status(200).json({
    status: 'success',
    data: {
      conversations,
    },
  });
});

// exports.createGroup = catchAsync(async (req, res, next) => {
//   const { name, users } = req.body;

//   // Handle group picture upload
//   let groupPicture

//   if (req.body.picture && typeof req.body.picture === 'string') {
//     // If picture was uploaded and processed by resizeUserAvatar
//     groupPicture = `/uploads/group/${req.body.picture}`;
//   } else {
//     // Use default group picture
//     groupPicture = process.env.DEFAULT_GROUP_PICTURE || '/uploads/default-group.png';
//   }

//     // Debug log to check what's in req.body.picture
//   console.log('req.body.picture:', req.body.picture);
//   console.log('typeof req.body.picture:', typeof req.body.picture);

//   // Add current user to users if not already included
//   const currentUserId = req.user._id.toString();
//   let usersList = Array.isArray(users) ? [...users] : [];

//   // Ensure IDs are valid and convert to string for comparison
//   const validUsers = usersList.filter((id) =>
//     mongoose.Types.ObjectId.isValid(id)
//   );

//   // Check if current user is already in the list
//   const currentUserIncluded = validUsers.some(
//     (id) => id.toString() === currentUserId
//   );

//   if (!currentUserIncluded) {
//     validUsers.push(req.user._id);
//   }

//   if (!name) {
//     return next(new AppError('Please provide a name for the group', 400));
//   }

//   if (validUsers.length < 2) {
//     return next(
//       new AppError('At least 2 users are required to start a group', 400)
//     );
//   }

//   // Create conversation data with admin explicitly set
//   let convoData = {
//     name,
//     users: validUsers,
//     isGroup: true,
//     admin: req.user._id, // Explicitly set the current user as admin
//     picture: groupPicture,
//   };

//   // Log the data being used to create the group
//   console.log('Creating group with data:', {
//     name: convoData.name,
//     usersCount: convoData.users.length,
//     admin: convoData.admin.toString(),
//     isGroup: convoData.isGroup,
//   });

//   const newConvo = await createConversation(convoData);

//   if (!newConvo) {
//     return next(new AppError('Failed to create group conversation', 500));
//   }

//   // Verify admin was set
//   if (!newConvo.admin) {
//     newConvo.admin = req.user._id;
//     await newConvo.save();
//     console.log('Fixed missing admin in newly created group');
//   }

//   const populatedConvo = await populateConversation(
//     newConvo._id,
//     'users admin picture',
//     '-password'
//   );

//   res.status(200).json({
//     status: 'success',
//     data: {
//       conversation: populatedConvo,
//     },
//   });
// });

exports.createGroup = catchAsync(async (req, res, next) => {
  const { name, users } = req.body;

  // Handle group picture upload
  let groupPicture;

  if (req.body.picture && typeof req.body.picture === 'string') {
    try {
      // Generate unique filename for the group picture
      const GroupFileName = `group-${uuidv4()}-${Date.now()}.jpeg`;
      const uploadDir = path.join(process.cwd(), 'Uploads', 'group');

      // Ensure the directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, GroupFileName);
      // Convert base64 to buffer and save the image
      const imageBuffer = Buffer.from(req.body.picture, 'base64');
      await sharp(imageBuffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 98 })
        .toFile(filePath);
      // Save filename to request body for database storage
      groupPicture = `/uploads/group/${GroupFileName}`;
      console.log('Group picture saved:', groupPicture);
    } catch (error) {
      console.error('Error processing group image:', error);
      // Use default picture if image processing fails
      groupPicture =
        process.env.DEFAULT_GROUP_PICTURE || '/uploads/default-group.png';
    }
  } else {
    // Use default group picture
    groupPicture =
      process.env.DEFAULT_GROUP_PICTURE || '/uploads/default-group.png';
  }

  // Debug log to check what's in req.body.picture
  console.log(
    'req.body.picture:',
    req.body.picture ? 'Base64 image provided' : 'No image'
  );
  console.log('typeof req.body.picture:', typeof req.body.picture);

  // Add current user to users if not already included
  const currentUserId = req.user._id.toString();
  let usersList = Array.isArray(users) ? [...users] : [];
  // Ensure IDs are valid and convert to string for comparison
  const validUsers = usersList.filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );
  // Check if current user is already in the list
  const currentUserIncluded = validUsers.some(
    (id) => id.toString() === currentUserId
  );
  if (!currentUserIncluded) {
    validUsers.push(req.user._id);
  }
  if (!name) {
    return next(new AppError('Please provide a name for the group', 400));
  }
  if (validUsers.length < 2) {
    return next(
      new AppError('At least 2 users are required to start a group', 400)
    );
  }
  // Create conversation data with admin explicitly set
  let convoData = {
    name,
    users: validUsers,
    isGroup: true,
    admin: req.user._id, // Explicitly set the current user as admin
    picture: groupPicture, // هنا اسم الصورة فقط
  };
  // Log the data being used to create the group
  console.log('Creating group with data:', {
    name: convoData.name,
    usersCount: convoData.users.length,
    admin: convoData.admin.toString(),
    isGroup: convoData.isGroup,
    picture: convoData.picture,
  });
  const newConvo = await createConversation(convoData);
  if (!newConvo) {
    return next(new AppError('Failed to create group conversation', 500));
  }
  // Verify admin was set
  if (!newConvo.admin) {
    newConvo.admin = req.user._id;
    await newConvo.save();
    console.log('Fixed missing admin in newly created group');
  }
  const populatedConvo = await populateConversation(
    newConvo._id,
    'users admin picture',
    '-password'
  );
  // حماية إضافية: لو picture فيها base64 أو طويلة جدًا، رجع اسم الصورة فقط
  if (
    populatedConvo &&
    populatedConvo.picture &&
    (populatedConvo.picture.length > 200 ||
      populatedConvo.picture.startsWith('data:image'))
  ) {
    populatedConvo.picture = groupPicture;
  }

  res.status(200).json({
    status: 'success',
    data: {
      conversation: populatedConvo,
    },
  });
});
/**
 * Add a user to a group conversation
 * Only group admin can add users
 */
exports.addUserToGroup = catchAsync(async (req, res, next) => {
  const { conversationId, userId } = req.body;

  // Validate required fields
  if (!conversationId || !userId) {
    return next(
      new AppError('Please provide conversation ID and user ID', 400)
    );
  }

  // Ensure IDs are valid ObjectIds
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return next(new AppError('Invalid ID format', 400));
  }

  // Find the conversation
  const conversation = await Conversation.findById(conversationId);

  // Check if conversation exists
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if it's a group conversation
  if (!conversation.isGroup) {
    return next(new AppError('This is not a group conversation', 400));
  }

  // Check if the admin field exists
  if (!conversation.admin) {
    return next(new AppError('Group conversation has no admin', 500));
  }

  // Check if the current user is the admin of the group
  const currentUserId = req.user._id.toString();
  const adminId = conversation.admin.toString();

  if (currentUserId !== adminId) {
    return next(new AppError('Only group admin can add users', 403));
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Convert userId to string for comparison
  const userIdStr = userId.toString();

  // Check if user is already in the group
  const userExists = conversation.users.some(
    (u) => u && u.toString() === userIdStr
  );
  if (userExists) {
    return next(new AppError('User is already in this group', 400));
  }

  // Add user to the group
  conversation.users.push(userId);
  await conversation.save();

  // Populate the updated conversation
  const populatedConversation = await populateConversation(
    conversationId,
    'users admin',
    '-password'
  );

  res.status(200).json({
    status: 'success',
    message: 'User added to group successfully',
    data: {
      conversation: populatedConversation,
    },
  });
});
/**
 * Remove a user from a group conversation
 * Only group admin can remove users
 */
exports.removeUserFromGroup = catchAsync(async (req, res, next) => {
  const { conversationId, userId } = req.body;

  // Validate required fields
  if (!conversationId || !userId) {
    return next(
      new AppError('Please provide conversation ID and user ID', 400)
    );
  }

  // Ensure IDs are valid ObjectIds
  if (
    !mongoose.Types.ObjectId.isValid(conversationId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return next(new AppError('Invalid ID format', 400));
  }

  // Find the conversation
  const conversation = await Conversation.findById(conversationId);

  // Check if conversation exists
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if it's a group conversation
  if (!conversation.isGroup) {
    return next(new AppError('This is not a group conversation', 400));
  }

  // Check if the current user is the admin of the group
  if (conversation.admin.toString() !== req.user._id.toString()) {
    return next(new AppError('Only group admin can remove users', 403));
  }

  // Check if user is in the group
  if (!conversation.users.some((user) => user.toString() === userId)) {
    return next(new AppError('User is not in this group', 400));
  }

  // Special handling if admin is removing themselves
  if (conversation.admin.toString() === userId) {
    // If admin is the only user, delete the group
    if (conversation.users.length === 1) {
      await Conversation.findByIdAndDelete(conversationId);

      return res.status(200).json({
        status: 'success',
        message: 'Group deleted as you were the only member',
      });
    }

    // Otherwise, transfer admin role to another user
    const newAdminId = conversation.users.find(
      (user) => user.toString() !== userId
    );

    conversation.admin = newAdminId;
  } // Remove user from the group
  conversation.users = conversation.users.filter(
    (user) => user.toString() !== userId
  );

  await conversation.save();

  // Don't try to populate if the group was deleted
  if (
    conversation.admin.toString() === userId &&
    conversation.users.length <= 1
  ) {
    return;
  }

  // Populate the updated conversation
  const populatedConversation = await populateConversation(
    conversationId,
    'users admin',
    '-password'
  );

  res.status(200).json({
    status: 'success',
    message: 'User removed from group successfully',
    data: {
      conversation: populatedConversation,
    },
  });
});
/**
 * Leave group conversation
 * Any user can leave a group they're part of
 */
exports.leaveGroup = catchAsync(async (req, res, next) => {
  const { conversationId } = req.body;
  const userId = req.user._id;

  // Validate required field
  if (!conversationId) {
    return next(new AppError('Please provide conversation ID', 400));
  }

  // Ensure ID is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return next(new AppError('Invalid conversation ID format', 400));
  }

  // Find the conversation
  const conversation = await Conversation.findById(conversationId);

  // Check if conversation exists
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if it's a group conversation
  if (!conversation.isGroup) {
    return next(new AppError('This is not a group conversation', 400));
  }

  // Check if user is in the group
  if (
    !conversation.users.some((user) => user.toString() === userId.toString())
  ) {
    return next(new AppError('You are not a member of this group', 400));
  }

  // If admin is leaving, check if there are other users to transfer admin role
  if (conversation.admin.toString() === userId.toString()) {
    // If admin is the only user, delete the group
    if (conversation.users.length === 1) {
      await Conversation.findByIdAndDelete(conversationId);

      return res.status(200).json({
        status: 'success',
        message: 'Group deleted as you were the only member',
      });
    }

    // Otherwise, transfer admin role to another user
    const newAdminId = conversation.users.find(
      (user) => user.toString() !== userId.toString()
    );

    conversation.admin = newAdminId;
  }

  // Remove user from the group
  conversation.users = conversation.users.filter(
    (user) => user.toString() !== userId.toString()
  );

  await conversation.save();

  res.status(200).json({
    status: 'success',
    message: 'You have left the group successfully',
  });
});
