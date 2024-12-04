"use client"

import { motion } from 'framer-motion';

function TextEditor({ value, onChange, placeholder }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full relative group"
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-full p-8 resize-none bg-transparent rounded-xl
          focus:outline-none focus:ring-1 focus:ring-blue-200
          placeholder:text-gray-300 text-gray-700 text-lg leading-relaxed
          transition-all duration-200"
      />
      <motion.div 
        className="absolute bottom-6 right-6 px-4 py-2 
          backdrop-blur-md bg-white/30 rounded-full shadow-sm 
          text-xs font-medium text-gray-500 opacity-0 group-hover:opacity-100
          transition-opacity duration-200"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {value.length} characters
      </motion.div>
    </motion.div>
  );
}

export default TextEditor;