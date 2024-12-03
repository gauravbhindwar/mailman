'use server'

import { sendEmail } from '@/utils/emailService';
import { getEmailConfig } from '@/utils/email-config';

export async function sendEmailAction(formData) {
  try {
    const userConfig = await getEmailConfig(formData.userId);
    
    const result = await sendEmail({
      from: {
        userId: formData.userId,
        email: formData.from
      },
      to: formData.to,
      subject: formData.subject,
      content: formData.content,
      userConfig
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Send Email Action Error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email. Please try again.'
    };
  }
}