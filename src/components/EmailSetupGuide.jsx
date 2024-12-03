import { useState } from 'react';
import { motion } from 'framer-motion';

export default function EmailSetupGuide() {
  return (
    <motion.div 
      className="mt-6 p-4 bg-blue-50 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="font-medium text-blue-900">Gmail Setup Instructions</h3>
      <ol className="mt-3 space-y-3 text-sm text-blue-800">
        <li>1. Enable 2-Step Verification in your Google Account</li>
        <li>2. Go to Google Account Security settings</li>
        <li>3. Select &quot;App passwords&quot; under &quot;2-Step Verification&quot;</li>
        <li>4. Generate a new app password for &quot;Mail&quot;</li>
        <li>5. Use your Gmail address and the generated app password for both SMTP and IMAP</li>
      </ol>
      <div className="mt-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
        Important: Use App Password instead of your regular Gmail password
      </div>
    </motion.div>
  );
}