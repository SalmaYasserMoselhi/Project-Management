const { error } = require('console');
const Conversation = require('./../models/conversationModel.js');
const User = require('./../models/userModel.js');
const AppError = require('./../utils/appError.js');
const catchAsync = require('./../utils/catchAsync.js');
const mongoose = require('mongoose');

const doesConversationExist = async (senderId, receiverId) => {
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
  const { receiverId } = req.body;

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
    receiverObjectId
  );
  if (existedConversation) {
    res.json(existedConversation);
  } else {
    let receiverUser = await User.findById(receiverObjectId);

    // Make sure receiverUser exists
    if (!receiverUser) {
      return next(new AppError('User not found', 404));
    }

    // Ensure name field is included and valid
    // let convoData = {
    //   name:
    //     receiverUser.username && receiverUser.username.trim() !== ''
    //       ? receiverUser.username
    //       : 'Conversation with ' + receiverObjectId,
    //   picture: receiverUser.picture,
    //   isGroup: false,
    //   users: [senderObjectId, receiverObjectId],
    // };
    let convoData = {
      name: 'conversation name',
      picture: 'conversation picture',
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
