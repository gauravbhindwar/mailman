import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../utils/encryption';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  emailSignature: {
    type: String,
    default: ''
  },
  settings: {
    emailsPerPage: {
      type: Number,
      default: 20
    },
    showEmailNotifications: {
      type: Boolean,
      default: true
    }
  },
  emailConfig: {
    smtp: {
      host: String,
      port: Number,
      secure: Boolean,
      user: String,
      password: {
        type: String,
        select: false
      }
    },
    imap: {
      host: String,
      port: Number,
      user: String,
      password: {
        type: String,
        select: false
      }
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Add pre-save middleware to encrypt email passwords
userSchema.pre('save', async function(next) {
  if (this.isModified('emailConfig.smtp.password')) {
    this.emailConfig.smtp.password = encrypt(this.emailConfig.smtp.password);
  }
  if (this.isModified('emailConfig.imap.password')) {
    this.emailConfig.imap.password = encrypt(this.emailConfig.imap.password);
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add method to safely get decrypted credentials
userSchema.methods.getEmailCredentials = function() {
  try {
    if (!this.emailConfig) return null;

    const smtp = this.emailConfig?.smtp || {};
    const imap = this.emailConfig?.imap || {};

    return {
      smtp: {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        user: smtp.user,
        password: smtp.password ? decrypt(smtp.password) : null
      },
      imap: {
        host: imap.host,
        port: imap.port,
        user: imap.user,
        password: imap.password ? decrypt(imap.password) : null
      }
    };
  } catch (error) {
    console.error('Error decrypting credentials:', error);
    return null;
  }
};

export default mongoose.models.User || mongoose.model('User', userSchema);
