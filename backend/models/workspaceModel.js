const mongoose = require('mongoose');
const User = require('./userModel');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workspace name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    visibility: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    settings: {
      type: Object,
      default: {
        defaultView: 'board',
        cardCoverEnabled: true,
        notificationsEnabled: true,
      },
    },
    branding: {
      type: Object,
      default: {
        logo: null,
        primaryColor: '#0079bf',
        backgroundColor: '#ffffff',
      },
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        role: {
          type: String,
          enum: ['system-admin', 'member', 'workspace-admin'],
          default: 'workspace-admin',
        },
        permissions: {
          type: [String],
          default: function () {
            {
              return this.role === 'workspace-admin'
                ? ['create', 'read', 'update', 'delete', 'manage-members']
                : ['read'];
            }
          },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);
workspaceSchema.index({ name: 1, createdBy: 1 }, { unique: true });
workspaceSchema.index({ 'members.userId': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;
