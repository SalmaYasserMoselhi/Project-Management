const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const Workspace = require('../models/workspaceModel');
const passport = require('passport');

// jwt.sign(payload, secretOrPrivateKey, options)
  const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

// Helper function to send verification email
const sendVerificationEmail = async (user, verificationToken) => {
  const verificationURL = `${process.env.BASE_URL}/users/verifyEmail/${verificationToken}`;

  const message = `
    <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #EFC235; text-align: center; font-size: 24px; margin-bottom: 20px;">Verify Your Email Address</h2>
        <p style="color: #3a2d34; text-align: center; font-size: 16px;">Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationURL}" style="background-color: #EFC235; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This link will expire in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">If you didn't create an account, please ignore this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Please verify your email address',
    message,
  });
};

// Add verification endpoint
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.params;

  // 1) Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // 2) Find user with matching token that hasn't expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  // if (!user) {
  //   return next(new AppError('Invalid or expired verification link', 400));
  // }
  if (!user) {
    // Instead of returning error JSON, redirect to frontend with error parameter
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?verification=failed`);
  }

  // 3) Update user
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

 // 4) Create token and set cookie, but DON'T send JSON response
 const jwtToken = signToken(user._id);
 res.cookie('jwt', jwtToken, {
   expires: new Date(
     Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
   ),
   httpOnly: true,
   secure: false,
   sameSite: 'lax',
   path: '/',
 });
 

  // 5) Redirect to frontend login page with success parameter
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(`${frontendUrl}/login?verified=true`);
});

exports.signup = catchAsync(
  // Main function
  async (req, res, next) => {
    const { email, username, password, passwordConfirm, firstName, lastName } =
      req.body;

    // 1) Create user
    const newUser = await User.create({
      firstName,
      lastName,
      username,
      email,
      password,
      passwordConfirm,
      emailVerified: false,
    });

    // Store user ID for potential cleanup
    req.createdUserId = newUser._id;

    // 2) Create default workspaces
    // Important: Remove the automatic workspace creation from userModel.js pre('save') middleware
    await Workspace.createDefaultWorkspaces(newUser._id, newUser.username);

    // 3) Generate verification token
    const verificationToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // 4) Send verification email
    await sendVerificationEmail(newUser, verificationToken);

    // 5) Return user with workspaces
    const userWithWorkspaces = await User.findById(newUser._id).populate(
      'workspaces'
    );

    res.status(201).json({
      status: 'success',
      message:
        'Account created successfully. Please verify your email to continue.',
      data: {
        user: userWithWorkspaces,
      },
    });
  },
  // Cleanup function - executed only on error
  async (req, err) => {
    if (req.createdUserId) {
      console.log(
        `Cleaning up after failed signup for user ID: ${req.createdUserId}`
      );
      // Delete user
      await User.findByIdAndDelete(req.createdUserId);
      // Delete associated workspaces
      await Workspace.deleteMany({ createdBy: req.createdUserId });
    }
  }
);

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password are provided
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Find user and include emailVerified status in selection
  const user = await User.findOne({ email })
    .select('+password')
    .select(
      'firstName lastName username email role status avatar emailVerified'
    );

  // 3) Check if user exists and password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4) Check if email is verified
  if (!user.emailVerified) {
    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send new verification email
    await sendVerificationEmail(user, verificationToken);

    return next(
      new AppError(
        'Please verify your email first. A new verification link has been sent to your email.',
        401
      )
    );
  }

  // 5) If everything is ok, send token and log in user
  createSendToken(user, 200, req, res);
  console.log(`User logged in: ${user.email}`);
});

// Handle successful Google authentication
// Google Authentication Methods
exports.googleAuth = async (req, res) => {
  const { frontendUrl } = req.query;

  if (!frontendUrl) {
    return res.status(400).json({
      status: 'error',
      message: 'Frontend URL is required',
    });
  }

  try {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: Buffer.from(JSON.stringify({ frontendUrl })).toString('base64'),
    })(req, res);
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error during Google authentication',
    });
  }
};

exports.handleCallback = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'firstName lastName username email role status avatar emailVerified workspaces'
    );

    // Check if user needs to have default workspaces created
    const workspaces = await Workspace.find({ createdBy: user._id });
    if (workspaces.length === 0) {
      // User doesn't have workspaces yet - create them
      console.log(`Creating default workspaces for OAuth user: ${user._id}`);
      await Workspace.createDefaultWorkspaces(user._id, user.username);
    }

    // Mark email as verified for OAuth users (since provider already verified it)
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save({ validateBeforeSave: false });
    }
    
    console.log('User data:', user);

    // Get the state from Google's response
    const { state } = req.query;

    // Decode the frontendUrl from state
    const { frontendUrl } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Create and send token
    const token = signToken(req.user._id);
    res.cookie('jwt', token, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    res.redirect(`${frontendUrl}/main`);
  } catch (error) {
    const frontendUrl = req.query.state
      ? JSON.parse(Buffer.from(req.query.state, 'base64').toString())
          .frontendUrl
      : process.env.BASE_URL;
    res.redirect(`${frontendUrl}/login`);
  }
};

// Github Authentication
exports.githubAuth = async (req, res) => {
  const { frontendUrl } = req.query;

  if (!frontendUrl) {
    return res.status(400).json({
      status: 'error',
      message: 'Frontend URL is required',
    });
  }

  try {
    passport.authenticate('github', {
      scope: ['user:email', 'read:user'],
      state: Buffer.from(JSON.stringify({ frontendUrl })).toString('base64'),
    })(req, res);
  } catch (error) {
    console.error('Github auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error during Github authentication',
    });
  }
};

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if it is there or exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in !! please log in to get access.', 401)
      // 401 mean this not authorized
    );
  }
  //2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) Check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }
  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please login again', 401)
    );
  }

  // Grant access to protected route
  res.locals.user = currentUser;
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(
  async (req, res, next) => {
    // 1) Get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(
        new AppError('There is no user with that email address', 404)
      );
    }

    // Store original state for potential rollback
    req.passwordResetInfo = {
      userId: user._id,
      originalVerificationState: {
        verificationCode: user.verificationCode,
        verificationCodeExpires: user.verificationCodeExpires,
      },
    };

    // 2) Generate a random 6-digit reset code
    const resetCode = user.createVerificationCode();
    await user.save({ validateBeforeSave: false }); // validateBeforeSave is set to false to prevent mongoose from validating the document before saving it

    // 3) Generate the email template
    const message = `
    <div style="background-color: #f6f9fc; padding: 20px; font-family: Arial, sans-serif;">
      <div style="background-color: white; padding: 20px; border-radius: 10px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #EFC235; text-align: center; font-size: 24px; margin-bottom: 20px;">Password Reset Code</h2>
        <p style="color: #3a2d34; text-align: center; font-size: 16px;">You requested a password reset. Use the code below to reset your password:</p>
        <div style="background-color: #EFC235; padding: 15px; margin: 20px auto; text-align: center; border-radius: 5px; font-size: 18px; font-weight: bold; color: #fff; width: fit-content;">
          ${resetCode}
        </div>
        <p style="color: #3a2d34; font-size: 14px; text-align: center; margin-bottom: 20px;">This code is valid for 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #e6e6e6; margin: 20px 0;">
        <p style="color: #888; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;

    // 3) Send the reset code to user's email
    await sendEmail({
      email: user.email,
      subject: 'Your Password Reset Code',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Reset code sent to your email.',
    });
  },
  // Cleanup function
  async (req, err) => {
    if (req.passwordResetInfo && req.passwordResetInfo.userId) {
      console.log(
        `Reverting verification code for user: ${req.passwordResetInfo.userId}`
      );

      // Reset the verification code to its original state
      await User.findByIdAndUpdate(
        req.passwordResetInfo.userId,
        {
          verificationCode:
            req.passwordResetInfo.originalVerificationState.verificationCode,
          verificationCodeExpires:
            req.passwordResetInfo.originalVerificationState
              .verificationCodeExpires,
        },
        { validateBeforeSave: false }
      );
    }
  }
);

exports.verifyResetCode = catchAsync(async (req, res, next) => {
  const { resetCode } = req.body;

  // 1) Hash the reset code
  const hashedCode = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');

  // 2) Find user by hashed code and check expiration
  const user = await User.findOne({
    verificationCode: hashedCode,
    verificationCodeExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Invalid or expired reset code', 400));
  }

  // 3) If code is valid, generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // validateBeforeSave

  // Set resetToken in cookie - will be used automatically in resetPassword
  res.cookie('passwordResetToken', resetToken, {
    maxAge: 10 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({
    status: 'success',
    message: 'Code verified successfully',
  });
});

exports.verifyResetSession = catchAsync(async (req, res, next) => {
  const resetToken = req.cookies.passwordResetToken;

  if (!resetToken) {
    return next(new AppError('Reset session has expired or is invalid', 400));
  }

  // Hash token from cookie
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Find user with matching hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Reset session has expired or is invalid', 400));
  }

  res.status(200).json({
    status: 'success',
    message: 'Valid reset session',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  const resetToken = req.cookies.passwordResetToken;

  if (!resetToken) {
    return next(new AppError('Reset session has expired or is invalid', 400));
  }

  // Hash token from cookie
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Find user with matching hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Reset session has expired or is invalid', 400));
  }

  // Update password
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();

  // Clear passwordResetToken cookie
  res.cookie('passwordResetToken', resetToken, {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

  // Log user in
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user info
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

  res.status(200).json({ status: 'success' });
};


// module.exports = {signToken};