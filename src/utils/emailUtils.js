import crypto from 'crypto';

export const generateConversationId = (from, to, subject) => {
  const participants = [from, to].sort().join('-');
  const cleanSubject = subject.toLowerCase().trim().replace(/^(re|fwd):\s*/i, '');
  return `${participants}-${cleanSubject}`;
};

export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const createVerificationUrl = (token) => {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify?token=${token}`;
};