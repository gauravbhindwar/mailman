'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmailSetupGuide from '@/components/EmailSetupGuide';

export default function EmailSetup() {
  const [activeTab, setActiveTab] = useState('smtp');
  const [syncCredentials, setSyncCredentials] = useState(true);
  const [config, setConfig] = useState({
    smtp: { 
      host: '',
      port: '',
      secure: true,
      user: '',
      password: ''
    },
    imap: {
      host: '',
      port: '',
      user: '',
      password: ''
    }
  });

  const presetProviders = {
    gmail: {
      smtp: { host: 'smtp.gmail.com', port: '587', secure: true },
      imap: { host: 'imap.gmail.com', port: '993' }
    },
    outlook: {
      smtp: { host: 'smtp-mail.outlook.com', port: '587', secure: false },
      imap: { host: 'outlook.office365.com', port: '993' }
    },
    yahoo: {
      smtp: { host: 'smtp.mail.yahoo.com', port: '587', secure: false },
      imap: { host: 'imap.mail.yahoo.com', port: '993' }
    }
  };

  const handlePresetSelect = (provider) => {
    setConfig(prev => ({
      smtp: { ...prev.smtp, ...presetProviders[provider].smtp },
      imap: { ...prev.imap, ...presetProviders[provider].imap }
    }));
  };

  const handleConfigChange = (type, field, value) => {
    setConfig(prev => {
      // If syncing is enabled and the field is user/password, update both SMTP and IMAP
      if (syncCredentials && (field === 'user' || field === 'password')) {
        return {
          smtp: { 
            ...prev.smtp, 
            [field]: value 
          },
          imap: { 
            ...prev.imap, 
            [field]: value 
          }
        };
      }
      
      // Otherwise just update the specific field
      return {
        ...prev,
        [type]: { ...prev[type], [field]: value }
      };
    });
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailConfig: {
            smtp: {
              host: config.smtp.host,
              port: parseInt(config.smtp.port),
              secure: config.smtp.secure,
              user: config.smtp.user,
              password: config.smtp.password
            },
            imap: {
              host: config.imap.host,
              port: parseInt(config.imap.port),
              user: config.imap.user,
              password: config.imap.password
            }
          }
        })
      });

      if (res.ok) {
        alert('Email configuration saved successfully!');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration: ' + error.message);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <motion.div 
      className="p-6 max-w-5xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="bg-white rounded-xl shadow-lg border border-gray-100"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="p-8">
          <motion.h2 
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Email Server Configuration
          </motion.h2>
          <motion.p 
            className="mt-3 text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Configure your email server settings for sending and receiving emails.
          </motion.p>

          <EmailSetupGuide />

          {/* Provider Presets */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="text-sm font-medium text-gray-700">Quick Setup:</label>
            <div className="mt-3 flex gap-3">
              {Object.keys(presetProviders).map((provider, index) => (
                <motion.button
                  key={provider}
                  onClick={() => handlePresetSelect(provider)}
                  className="px-6 py-3 text-sm rounded-lg border bg-white hover:bg-gray-50 capitalize
                    shadow-sm hover:shadow transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {provider}
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div 
            className="mt-6 flex items-center space-x-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <input
              type="checkbox"
              id="syncCredentials"
              checked={syncCredentials}
              onChange={(e) => setSyncCredentials(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="syncCredentials" className="text-sm text-gray-600">
              Keep SMTP and IMAP credentials in sync
            </label>
          </motion.div>

          {/* Configuration Tabs */}
          <div className="mt-8">
            <div className="flex space-x-8">
              {['smtp', 'imap'].map((tab, index) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-sm font-medium rounded-lg transition-colors uppercase tracking-wide
                    ${activeTab === tab 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tab} Settings
                </motion.button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.form 
              key={activeTab}
              onSubmit={saveConfig}
              className="mt-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={activeTab === 'smtp' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-6">
                  {/* SMTP Fields */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                    <input
                      type="text"
                      value={config.smtp.host}
                      onChange={(e) => handleConfigChange('smtp', 'host', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                    <input
                      type="number"
                      value={config.smtp.port}
                      onChange={(e) => handleConfigChange('smtp', 'port', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="587"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
                    <input
                      type="email"
                      value={config.smtp.user}
                      onChange={(e) => handleConfigChange('smtp', 'user', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">SMTP Password</label>
                    <input
                      type="password"
                      value={config.smtp.password}
                      onChange={(e) => handleConfigChange('smtp', 'password', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className={activeTab === 'imap' ? 'block' : 'hidden'}>
                <div className="grid grid-cols-2 gap-6">
                  {/* IMAP Fields */}
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">IMAP Host</label>
                    <input
                      type="text"
                      value={config.imap.host}
                      onChange={(e) => handleConfigChange('imap', 'host', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="imap.example.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">IMAP Port</label>
                    <input
                      type="number"
                      value={config.imap.port}
                      onChange={(e) => handleConfigChange('imap', 'port', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="993"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">IMAP Username</label>
                    <input
                      type="email"
                      value={config.imap.user}
                      onChange={(e) => handleConfigChange('imap', 'user', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">IMAP Password</label>
                    <input
                      type="password"
                      value={config.imap.password}
                      onChange={(e) => handleConfigChange('imap', 'password', e.target.value)}
                      className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {syncCredentials && activeTab === 'imap' && (
                  <p className="mt-2 text-sm text-gray-500">
                    Credentials are currently synced with SMTP settings
                  </p>
                )}
              </div>

              <motion.div 
                className="mt-8 flex items-center justify-end gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  type="button"
                  onClick={() => setConfig({
                    smtp: { 
                      host: '',
                      port: '',
                      secure: true,
                      user: '',
                      password: ''
                    },
                    imap: {
                      host: '',
                      port: '',
                      user: '',
                      password: ''
                    }
                  })}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border 
                    border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reset
                </motion.button>
                <motion.button
                  type="submit"
                  className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg 
                    hover:bg-blue-700 transition-all duration-200"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Save Configuration
                </motion.button>
              </motion.div>
            </motion.form>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}