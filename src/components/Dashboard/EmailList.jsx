import Link from 'next/link';

export default function EmailList({ emails, type }) {
  if (!emails?.length) {
    return <div className="p-4">No emails found.</div>;
  }

  return (
    <div className="divide-y">
      {emails.map((email) => (
        <Link 
          key={email.id}
          href={`/dashboard/${type}/${email.id}`}
          className="block p-4 hover:bg-gray-50"
        >
          <div className="flex justify-between">
            <span className="font-medium">
              {type === 'inbox' ? email.from : email.to}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(email.date).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600">{email.subject}</p>
        </Link>
      ))}
    </div>
  );
}