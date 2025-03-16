const mongoose = require('mongoose');
const { type } = require('os');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A message must have a sender'],
    },
    message: {
      type: String,
      trim: true,
    },
    conversation: {
      type: mongoose.Schema.ObjectId,
      ref: 'Conversation',
    },
    files: [],
  },
  {
    collection: 'messages',
    timestamps: true,
  }
);

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
