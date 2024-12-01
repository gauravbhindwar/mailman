"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RiUserAddLine } from 'react-icons/ri'
import { FiLogIn } from 'react-icons/fi'
import './Homepage.css'

const Homepage = () => {
  const router = useRouter();

  return (
    <div className="hero-section min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
      <div className="hero-content relative z-10">
        <h1>Welcome to Mailman</h1>
        <p>Send and receive emails with ease</p>
        <div className="flex gap-4 mt-8">
          <motion.button
            onClick={() => router.push('/auth/signup')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <RiUserAddLine size={18} />
              Get Started
            </span>
          </motion.button>
          <motion.button
            onClick={() => router.push('/auth/login')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            <span className="flex items-center justify-center gap-2">
              <FiLogIn size={18} />
              Continue
            </span>
          </motion.button>
        </div>
      </div>
      <div className="animation-container">
        <motion.div 
          className="email-send" 
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }} 
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div 
          className="email-receive" 
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }} 
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    </div>
  )
}

export default Homepage