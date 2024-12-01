'use client';
import { useState } from 'react';
import EmailSetupGuide from '@/components/EmailSetupGuide';

export default function EmailSetup() {
  const [config, setConfig] = useState({
    smtp: { 
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      user: '',
      password: ''
    },
    imap: {
      host: 'imap.gmail.com',
      port: 993,
      user: '',
      password: ''
    }
  });

  const handleEmailChange = (email) => {
    setConfig(prev => ({
      smtp: { ...prev.smtp, user: email },
      imap: { ...prev.imap, user: email }
    }));
  };

  const handlePasswordChange = (password) => {
    setConfig(prev => ({
      smtp: { ...prev.smtp, password },
      imap: { ...prev.imap, password }
    }));
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/nodemailer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        alert('Gmail configuration saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gmail Setup</h2>
      
      <EmailSetupGuide />

      <form onSubmit={saveConfig} className="mt-6 space-y-4">
        <div>
          <label className="block mb-2">Gmail Address:</label>
          <input
            type="email"
            value={config.smtp.user}
            onChange={(e) => handleEmailChange(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="your.email@gmail.com"
            required
          />
        </div>
        <div>
          <label className="block mb-2">App Password:</label>
          <input
            type="password"
            value={config.smtp.password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="16-character app password"
            required
            pattern=".{16,16}"
            title="App password must be 16 characters"
          />
        </div>
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save Gmail Configuration
        </button>
      </form>
    </div>
  );
}