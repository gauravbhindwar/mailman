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

// Add validation for email config
userSchema.pre('save', function(next) {
  if (this.isModified('emailConfig')) {
    // Validate required fields
    if (this.emailConfig.smtp) {
      const smtp = this.emailConfig.smtp;
      if (!smtp.user || !smtp.password || !smtp.host || !smtp.port) {
        throw new Error('Missing required SMTP configuration');
      }
    }
    
    if (this.emailConfig.imap) {
      const imap = this.emailConfig.imap;
      if (!imap.user || !imap.password || !imap.host || !imap.port) {
        throw new Error('Missing required IMAP configuration');
      }
    }
  }
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update getEmailCredentials method
userSchema.methods.getEmailCredentials = function() {
  if (!this.emailConfig) {
    throw new Error('Email configuration not found');
  }

  const decryptPassword = (encryptedPassword) => {
    try {
      return encryptedPassword ? decrypt(encryptedPassword) : null;
    } catch (error) {
      console.error('Password decryption failed:', error);
      return null;
    }
  };

  return {
    smtp: {
      ...this.emailConfig.smtp,
      password: decryptPassword(this.emailConfig.smtp?.password)
    },
    imap: {
      ...this.emailConfig.imap,
      password: decryptPassword(this.emailConfig.imap?.password)
    }
  };
};

// Add method to test email configuration
userSchema.methods.testEmailConnection = async function() {
  const credentials = this.getEmailCredentials();
  
  // Test IMAP connection
  const imap = new Imap({
    user: credentials.imap.user,
    password: credentials.imap.password,
    host: credentials.imap.host,
    port: credentials.imap.port,
    tls: true,
    authTimeout: 30000,
    auth: {
      user: credentials.imap.user,
      pass: credentials.imap.password,
      authMethod: 'PLAIN'
    }
  });

  return new Promise((resolve, reject) => {
    imap.once('ready', () => {
      imap.end();
      resolve(true);
    });

    imap.once('error', (err) => {
      imap.end();
      reject(err);
    });

    imap.connect();
  });
};

export default mongoose.models.User || mongoose.model('User', userSchema);
