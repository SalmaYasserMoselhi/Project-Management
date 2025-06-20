const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['card', 'chat'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes to help with lookups
// fileSchema.index({ entityType: 1, entityId: 1 });
// fileSchema.index({ uploadedBy: 1 });
// fileSchema.index({ isDeleted: 1 });

// Virtual للـ download URL
fileSchema.virtual('url').get(function () {
  return `/api/v1/attachments/${this._id}/download`;
});

// Virtual للـ display URL (للعرض في الواجهة)
fileSchema.virtual('displayUrl').get(function () {
  return `${process.env.BASE_FILE_URL}/api/v1/attachments/${this._id}/download`;
});




// // FIXED: Improved the post-init hook to be more reliable
// fileSchema.post('init', function(doc) {
//   if (doc.filename && !doc.filename.startsWith('http')) {
//     // Only modify if it's not already a URL
//     doc.displayUrl = `${process.env.BASE_FILE_URL}/attachments/download/${doc._id}`;
//   }
// });
fileSchema.post('init', (doc) => {
  // http://localhost:3000/attachments/attach-add7c5fd-f4e1-45d4-9625-ecbe485e9101-1745619165369.png
    if (doc.filename)
  {
    const imageURL = doc.filename.startsWith('https://')
      ? doc.filename
      : `${process.env.BASE_FILE_URL}/attachments/${doc.filename}`;
    doc.filename = imageURL;
  }
});

// Method to format file size for display
fileSchema.methods.formatSize = function () {
  const bytes = this.size;
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

module.exports = mongoose.model('Attachment', fileSchema);
