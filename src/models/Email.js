import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      // Only require 'from' if there's no externalSender
      return !this.externalSender;
    }
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    path: String,
    contentType: String
  }],
  externalSender: String,
  externalId: String
});

const emailSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    index: true,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  messages: [messageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['inbox', 'sent', 'archived', 'trash'],
    required: true,
    index: true
  },
  toEmail: String
});

// Update indexes
emailSchema.index({ participants: 1, lastMessageAt: -1 });
emailSchema.index({ subject: 'text' });
emailSchema.index({ conversationId: 1, lastMessageAt: -1 });

// Remove the static method and keep only schema configuration
emailSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return {
      id: ret._id.toString(),
      conversationId: ret.conversationId,
      subject: ret.subject,
      messages: ret.messages.map(msg => ({
        ...msg,
        id: msg._id.toString(),
        createdAt: msg.createdAt.toISOString()
      })),
      participants: ret.participants?.map(p => ({
        id: p._id?.toString(),
        name: p.name,
        email: p.email
      })),
      status: ret.status,
      toEmail: ret.toEmail,
      lastMessageAt: ret.lastMessageAt.toISOString()
    };
  }
});

export default mongoose.models.Email || mongoose.model('Email', emailSchema);