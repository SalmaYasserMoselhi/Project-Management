const multer = require('multer'); // to upload user image
const sharp = require('sharp'); // to resize user image
const { v4: uuidv4 } = require('uuid');
const AppError = require('./../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const { uploadSingleImage } = require('../Middlewares/fileUploadMiddleware');
const User = require('./../models/userModel');
const Workspace = require('../models/workspaceModel');
const mongoose = require('mongoose');

exports.uploadUserAvatar = uploadSingleImage('avatar');

exports.resizeUserAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  const AvatarFileName = `user-${uuidv4()}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 98 })
    .toFile(`Uploads/users/${AvatarFileName}`);

  // save To DB
  req.body.avatar = AvatarFileName;
  next();
});

//to update only fields we choose
// const filterObj = (obj, ...allowFields) => {
//   const newObj = {};
//   Object.keys(obj).forEach((el) => {
//     if (allowFields.includes(el)) {
//       newObj[el] = obj[el];
//     }
//   });
//   return newObj;
// };

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});
exports.createUser = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      user: newUser,
    },
  });
});
//don't update password with this!
//findByIdAndUpdate skip any middleware so password may not be hashed
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    return next(new AppError('No user found with this ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError('No user found with ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
//active: false
// exports.deleteMe = catchAsync(async (req, res, next) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

exports.deleteMe = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  try {
    // Clean up related data before deleting user

    // 1. Remove user from all workspaces where they are a member
    await Workspace.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // 2. Delete workspaces created by this user
    await Workspace.deleteMany({ createdBy: userId });

    // 3. Actually DELETE the user from database (not just set active: false)
    await User.findByIdAndDelete(userId);

    // 4. Clear the JWT cookie since user no longer exists
    res.cookie('jwt', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    res.status(200).json({
      status: 'success',
      message: 'Your account has been permanently deleted',
      data: null,
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return next(new AppError('Failed to delete account', 500));
  }
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route not for updating password', 400));
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
exports.getMe = (req, res, next) => {
  const user = req.user;

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
};

exports.searchUsers = catchAsync(async (req, res, next) => {
  const {
    query,
    firstName,
    lastName,
    username,
    email,
    sort,
    limit = 10,
    page = 1,
  } = req.query;

  let searchQuery = {};

  if (query) {
    searchQuery = {
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    };
  } else {
    if (firstName) searchQuery.name = { $regex: name, $options: 'i' };
    if (lastName) searchQuery.name = { $regex: name, $options: 'i' };
    if (email) searchQuery.email = { $regex: email, $options: 'i' };
    if (username) searchQuery.username = { $regex: username, $options: 'i' };
  }

  if (req.query.active === undefined) {
    searchQuery.active = { $ne: false };
  } else if (req.query.active === 'false') {
    searchQuery.active = false;
  } else if (req.query.active === 'true') {
    searchQuery.active = true;
  }

  let userQuery = User.find(searchQuery);

  if (sort) {
    const sortBy = sort.split(',').join(' ');
    userQuery = userQuery.sort(sortBy);
  } else {
    userQuery = userQuery.sort('-createdAt');
  }

  const skip = (page - 1) * limit;
  userQuery = userQuery.skip(skip).limit(Number(limit));

  const users = await userQuery;

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.searchWorkspaceUsers = catchAsync(async (req, res, next) => {
  const currentUserId = req.user._id;
  const searchTerm = req.query.search || '';

  const userWorkspaces = await Workspace.find({
    'members.user': currentUserId, // يعني موجود جوه الميمبرز
  }).select('members.user');

  const workspaceMemberIds = new Set();

  userWorkspaces.forEach((workspace) => {
    workspace.members.forEach((member) => {
      if (member.user) {
        workspaceMemberIds.add(member.user.toString());
      }
    });
  });

  if (workspaceMemberIds.size === 0) {
    return res.status(200).json({
      status: 'success',
      results: 0,
      data: { users: [] },
    });
  }

  const memberIdsArray = Array.from(workspaceMemberIds).map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  const query = {
    _id: { $in: memberIdsArray, $ne: currentUserId },
  };

  if (searchTerm.trim()) {
    query.$or = [
      { username: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const users = await User.find(query).select(
    'username email avatar _id firstName lastName'
  );

  return res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

exports.getUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select('status');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ userId: id, status: user.status });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  if (!['online', 'offline'].includes(status)) {
    return next(new AppError('Status must be either online or offline', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      status,
      statusChangedAt: Date.now(),
    },
    {
      new: true,
      validateBeforeSave: false,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        _id: user._id,
        status: user.status,
        statusChangedAt: user.statusChangedAt,
      },
    },
  });
});

exports.getUsersStatuses = catchAsync(async (req, res, next) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ status: 'fail', message: 'No ids provided' });
  }
  const users = await User.find({ _id: { $in: ids } }).select('_id status');
  res.status(200).json({ status: 'success', users });
});
