export default function EmailView({ email }) {
    if (!email) return <div className="p-4">Email not found</div>;
  
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">{email.subject}</h2>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <div>
              <p>From: {email.from}</p>
              <p>To: {email.to}</p>
            </div>
            <p>{new Date(email.date).toLocaleString()}</p>
          </div>
        </div>
        <div className="prose max-w-none whitespace-pre-wrap">
          {email.content}
        </div>
      </div>
    );
  }