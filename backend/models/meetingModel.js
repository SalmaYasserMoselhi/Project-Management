const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Meeting name is required'],
    trim: true,
    maxlength: [100, 'Meeting name cannot exceed 100 characters'],
  },
  date: {
    type: Date,
    required: [true, 'Meeting date is required'],
  },
  color: {
    type: String,
    default: '#3B82F6', // Better default color (blue)
    validate: {
      validator: function(v) {
        // Validate hex color format (#RGB or #RRGGBB)
        return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(v);
      },
      message: 'Color must be a valid hex color (e.g., #FF5733 or #F53)'
    }
  },
  time: {
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
    },
  },
  onlineLink: {
    type: String,
    trim: true,
  },
  attendees: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      }
    },
  ],
  board: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: [true, 'Meeting must belong to a board'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
},
{
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
}
);

module.exports = mongoose.model('Meeting', meetingSchema);