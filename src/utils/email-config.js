import User from '../models/User';
import { connect } from '../lib/dbConfig';

// Add SMTP provider configurations
const SMTP_PROVIDERS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true
  },
  outlook: {
    host: 'smtp.office365.com',
    port: 587,
    secure: false
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 465,
    secure: true
  }
};

export async function getEmailConfig(userId) {
  try {
    await connect();
    const user = await User.findById(userId)
      .select('+emailConfig.smtp.password +emailConfig.smtp.host +emailConfig.smtp.port +emailConfig.smtp.user');

    if (!user?.emailConfig?.smtp) {
      throw new Error('Email configuration not found');
    }

    const config = user.getEmailCredentials();
    
    // Determine provider and apply provider-specific settings
    const email = config.smtp.user.toLowerCase();
    let providerSettings = {};
    
    if (email.includes('gmail.com')) {
      providerSettings = SMTP_PROVIDERS.gmail;
    } else if (email.includes('outlook.com') || email.includes('hotmail.com')) {
      providerSettings = SMTP_PROVIDERS.outlook;
    } else if (email.includes('yahoo.com')) {
      providerSettings = SMTP_PROVIDERS.yahoo;
    }

    // Merge provider settings with user config
    return {
      ...config,
      smtp: {
        ...providerSettings,
        ...config.smtp,
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        }
      }
    };
  } catch (error) {
    console.error('Error fetching email config:', error);
    throw new Error(`Failed to load email configuration: ${error.message}`);
  }
}

export function validateSMTPConfig(config) {
  if (!config?.smtp) {
    throw new Error('SMTP configuration is required');
  }

  const { host, port, user, password } = config.smtp;
  const missingFields = [];

  if (!host) missingFields.push('SMTP Host');
  if (!port) missingFields.push('SMTP Port');
  if (!user) missingFields.push('SMTP Username');
  if (!password) missingFields.push('SMTP Password');

  if (missingFields.length > 0) {
    throw new Error(`Incomplete SMTP configuration. Missing: ${missingFields.join(', ')}`);
  }

  return true;
}