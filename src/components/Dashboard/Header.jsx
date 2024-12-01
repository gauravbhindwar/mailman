'use client';

import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

export default function Header() {
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  return (
    <header className="w-full p-4 bg-white border-b">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Mailman</h1>
        <div className="flex items-center gap-4">
          <span>{session?.user?.email}</span>
          <button 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`px-4 py-2 text-sm rounded-md transition-colors
              ${isSigningOut 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gray-100 hover:bg-gray-200'
              }`}
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </header>
  );
}