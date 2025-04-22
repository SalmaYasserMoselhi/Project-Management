const { error } = require('console');
const Conversation = require('./../models/conversationModel.js');
const User = require('./../models/userModel.js');
const AppError = require('./../utils/appError.js');
const catchAsync = require('./../utils/catchAsync.js');
const mongoose = require('mongoose');

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

exports.createGroup = catchAsync(async (req, res, next) => {
  const { name, users } = req.body;
  // Add current user to users
  users.push(req.user.userId);
  if (!name || !users) {
    return next(new AppError('please fill all fields.', 400));
  }
  if (users.length < 2) {
    return next(
      new AppError('At least 2 users are required to start a group.', 400)
    );
  }
  let convoData = {
    name,
    users,
    isGroup: true,
    admin: req.user.userId,
    picture: process.env.DEFAULT_GROUP_PICTURE,
  };
  const newConvo = await createConversation(convoData);
  const populatedConvo = await populateConversation(
    newConvo._id,
    'users admin',
    '-password'
  );
  console.log(populatedConvo);
  res.status(200).json({
    status: 'success',
    data: {
      populatedConvo,
    },
  });
});
