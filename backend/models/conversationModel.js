const mongoose = require('mongoose');
const User = require('./userModel');

const { type } = require('os');

const conversationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Conversation name is required'],
      trim: true,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    picture: {
      type: String,
      required: true,
    },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: 'Message',
    },
    admin: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    collection: 'Conversation',
    timestamps: true,
  }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
