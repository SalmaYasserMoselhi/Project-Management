const Workspace = require('../models/workspaceModel.js');
const AppError = require('../utils/appError.js');
const catchAsync = require('../utils/catchAsync.js');
const User = require('../models/userModel');

exports.createWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.create({
    ...req.body,
    createdBy: req.user._id,
    members: [{ userId: req.user._id, role: 'workspace-admin' }],
  });

  res.status(201).json({
    status: 'success',
    data: { workspace },
  });
});

exports.getAllWorkspaces = catchAsync(async (req, res, next) => {
  const workspaces = await Workspace.find({
    'members.userId': req.user._id,
  }).populate('createdBy', 'firstName lastName email');

  res.status(200).json({
    status: 'success',
    results: workspaces.length,
    data: { workspaces },
  });
});

exports.getWorkspaceById = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId)
    .populate('members.userId', 'firstName lastName email avatar')
    .populate('createdBy', 'name description');

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

exports.getUserWorkspaces = catchAsync(async (req, res, next) => {
  // 1) Build Query
  const queryObj = { 'members.userId': req.user._id };

  // Filter by visibility if specified
  if (req.query.visibility) {
    queryObj.visibility = req.query.visibility; //public , private
  }

  // Search by name if specified
  if (req.query.search) {
    queryObj.name = { $regex: req.query.search, $options: 'i' };
  }

  // 2) Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // 3) Build Query with Sorting
  let query = Workspace.find(queryObj)
    .populate({
      path: 'members.userId',
      select: 'firstName lastName email avatar',
    })
    .populate('createdBy', 'firstName lastName email')
    .skip(skip)
    .limit(limit);

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt'); // Default sort by newest
  }

  // 4) Execute Query
  const [workspaces, totalWorkspaces] = await Promise.all([
    query,
    Workspace.countDocuments(queryObj),
  ]);

  // 5) Calculate Pagination Info
  const totalPages = Math.ceil(totalWorkspaces / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 6) Send Response
  res.status(200).json({
    status: 'success',
    results: workspaces.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalWorkspaces,
      hasNextPage,
      hasPrevPage,
      limit,
    },
    data: {
      workspaces,
    },
  });
});

exports.updateWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findByIdAndUpdate(
    req.params.workspaceId,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

exports.deleteWorkspace = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findByIdAndDelete(req.params.workspaceId);
  if (!workspace) {
    return next(new AppError('No workspace found with ID', 404));
  }
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.addMember = catchAsync(async (req, res, next) => {
  // 1. العثور على workspace
  const workspace = await Workspace.findById(req.params.workspaceId);
  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const { email, role = 'member' } = req.body;

  // 2. البحث عن المستخدم باستخدام الإيميل
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }

  // 3. التأكد من وجود مصفوفة members
  if (!workspace.members) {
    workspace.members = [];
  }

  // 4. التحقق من وجود المستخدم في الـ workspace بشكل آمن
  const isMemberExists = workspace.members.some((member) => {
    // التحقق من أن member و userId موجودين قبل استخدام toString
    return (
      member &&
      member.userId &&
      member.userId.toString() === user._id.toString()
    );
  });

  // 5. إذا كان موجود، نرجع رسالة
  if (isMemberExists) {
    return next(new AppError('Member already exists in this workspace', 400));
  }

  // 6. إذا لم يكن موجود، نضيف العضو
  workspace.members.push({
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    username: user.username,
    userId: user._id,
    role,
  });

  if (workspace.visibility === 'private') {
    workspace.visibility = 'public'; // Set visibility to 'private'
  }

  // 7. حفظ التغييرات
  const updatedWorkspace = await workspace.save();

  // 8. إرسال الرد
  res.status(200).json({
    status: 'success',
    message: 'Member added successfully',
    data: {
      workspace: updatedWorkspace,
    },
  });
});

exports.removeMember = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  workspace.members = workspace.members.filter(
    (member) => member.userId.toString() !== req.params.userId
  );

  await workspace.save();

  res.status(200).json({
    status: 'success',
    data: { workspace },
  });
});

exports.checkWorkspaceAccess = catchAsync(async (req, res, next) => {
  const workspace = await Workspace.findById(req.params.workspaceId);

  if (!workspace) {
    return next(new AppError('Workspace not found', 404));
  }

  const isMember = workspace.members.some(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!isMember && workspace.visibility !== 'public') {
    return next(new AppError('You do not have access to this workspace', 403));
  }

  req.workspace = workspace;
  next();
});

exports.checkWorkspaceAdmin = catchAsync(async (req, res, next) => {
  const member = req.workspace.members.find(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!member || member.role !== 'workspace-admin') {
    return next(
      new AppError('You must be an admin to perform this action', 403)
    );
  }
  next();
});

exports.checkWorkspaceMember = catchAsync(async (req, res, next) => {
  const member = req.workspace.members.find(
    (member) => member.userId.toString() === req.user._id.toString()
  );

  if (!member) {
    return next(
      new AppError('You must be a member to perform this action', 403)
    );
  }

  next();
});

exports.checkWorkspaceName = catchAsync(async (req, res, next) => {
  if (!req.body.name) return next();

  const existingWorkspace = await Workspace.findOne({
    name: req.body.name,
    'members.userId': req.user._id,
  });

  if (
    existingWorkspace &&
    existingWorkspace._id.toString() !== req.params.workspaceId
  ) {
    return next(
      new AppError('You already have a workspace with this name', 400)
    );
  }

  next();
});
