const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const Workspace = require('./workspaceModel');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: false,
      default: '',
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Each user must have a username'],
      unique: [true, 'Username already exists'],
      trim: true,
      validate: {
        validator: function (value) {
          // Username should not contain spaces
          return !value.includes(' ');
        },
        message: 'Username should not contain spaces',
      },
    },
    email: {
      type: String,
      required: [true, 'Each user must have an email'],
      trim: true,
      unique: true,
      lowercase: true,
      validate: [
        validator.isEmail,
        "user email must be valid 'user@example.com' ",
      ],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows the field to be null/undefined for non-Google users
    },
    avatar: {
      type: String,
      default: 'default.jpg',
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    statusChangedAt: {
      type: Date,
      default: Date.now,
    },
    // role: {
    //   type: String,
    //   enum: ['owner', 'admin', 'member'], // Changed to match workspace roles
    //   default: 'member',
    // },
    password: {
      type: String,
      required: [true, 'Please provide a strong password'],
      minLength: [8, 'A user password must have more or equal 8 characters'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm the password'],
      validate: {
        validator: function (el) {
          return el === this.password;
        },
        message: 'passwords are not the same!',
      },
    },
    passwordChangedAt: Date,
    verificationCode: {
      type: String,
      select: false,
    },
    verificationCodeExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetTokenExpires: {
      type: Date,
      select: false,
    },
    active: {
      type: Boolean,
      default: true, // active user account
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    preferences: {
      type: Object,
      default: {
        language: 'en',
        timezone: 'UTC',
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual field for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// VIRTUAL POPULATE, 'Virtual Child Referencing' to get all workspaces of a user
userSchema.virtual('workspaces', {
  ref: 'Workspace',
  foreignField: 'members.user', // 'members.user' is the field in Workspace model that reference to User model
  localField: '_id', // The User's ID (used to match workspaces)
  options: {
    select: '_id', // Only include ID by default
    transform: (doc) => doc._id, // Convert to just ID string
  },
});

userSchema.pre('save', async function (next) {
  // Only run this fun if password is modified
  // password "field"
  if (!this.isModified('password')) return next();
  // Hash the password with cost 12
  this.password = await bcrypt.hash(this.password, 12);
  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  this.passwordChangedAt = this.passwordChangedAt;
  next();
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the currently query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusChangedAt = Date.now();
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      await Workspace.createDefaultWorkspaces(this._id);
    } catch (error) {
      return next(error); // Prevent user creation if workspaces fail
    }
  }
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};
userSchema.methods.changedPasswordAfter = function (JWTTimesTamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimesTamp);
    return JWTTimesTamp < changedTimestamp;
  }
  return false;
};
userSchema.methods.createVerificationCode = function () {
  // Generate a 6-digit random code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  this.verificationCode = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex'); // Hash the token to store in DB

  // Set expiration time for the reset code (10 minutes)
  this.verificationCodeExpires = Date.now() + 10 * 60 * 1000;

  // Return the plain reset code to send it via email
  return resetCode;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Add method to create email verification token
userSchema.methods.createEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return verificationToken;
};

userSchema.methods.isOnline = function () {
  return (
    // First condition: check if status is set to 'online'
    this.status === 'online' &&
    // Second condition: check if user was active in last 5 minutes
    Date.now() - this.statusChangedAt < 5 * 60 * 1000
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;
