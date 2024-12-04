'use client';

import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

export default function Header({ onMenuClick }) {
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
    <header className="w-full p-4 backdrop-blur-xl bg-white/10 border-b border-white/20 fixed top-0 left-0 right-0 z-50">
      <div className="flex justify-between items-center max-w-[1920px] mx-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Mailman
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-gray-300">{session?.user?.email}</span>
          <button 
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 ${
              isSigningOut 
                ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </header>
  );
}