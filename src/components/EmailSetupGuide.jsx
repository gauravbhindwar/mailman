const EmailSetupGuide = ({ provider }) => {
  const guide = {
    title: 'Gmail Setup Guide',
    steps: [
      '1. Enable 2-Step Verification: Go to Google Account → Security → 2-Step Verification',
      '2. Generate App Password: Go to Google Account → Security → App passwords',
      '3. Select "Mail" and your device type (select "Other" if needed)',
      '4. Enter "Mailman" as the app name',
      '5. Copy the 16-character password generated',
      '6. Use your Gmail address and this app password below'
    ],
    smtpSettings: {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true
    },
    imapSettings: {
      host: 'imap.gmail.com',
      port: 993
    },
    link: 'https://myaccount.google.com/security'
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold text-lg">{guide.title}</h3>
      <ul className="mt-2 space-y-2">
        {guide.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
      <div className="mt-4">
        <h4 className="font-semibold">SMTP Settings</h4>
        <pre className="bg-gray-100 p-2 rounded mt-1">
          {JSON.stringify(guide.smtpSettings, null, 2)}
        </pre>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold">IMAP Settings</h4>
        <pre className="bg-gray-100 p-2 rounded mt-1">
          {JSON.stringify(guide.imapSettings, null, 2)}
        </pre>
      </div>
      <a 
        href={guide.link} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-4 text-blue-600 hover:underline inline-block"
      >
        Get App Password →
      </a>
    </div>
  );
};

export default EmailSetupGuide;