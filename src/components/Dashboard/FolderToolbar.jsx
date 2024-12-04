import { motion } from 'framer-motion';
import { 
  MdRefresh, 
  MdArchive, 
  MdDelete, 
  MdLabel,
  MdMoreVert,
  MdCheckBox,
  MdCheckBoxOutlineBlank
} from 'react-icons/md';

const FolderToolbar = ({ 
  title, 
  selectedEmails = [], 
  onRefresh,
  extraButtons,
  selectionMessage 
}) => {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center p-4"
      >
        <h1 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          {title}
        </h1>
        
        <div className="flex items-center gap-2">
          {selectedEmails.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-gray-300">
                {selectedEmails.length} selected
              </span>
              {extraButtons}
              {title !== 'Trash' && (
                <>
                  <button className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
                    <MdArchive className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
                    <MdDelete className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors">
                    <MdLabel className="w-5 h-5" />
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <button 
              onClick={onRefresh}
              className="p-2 hover:bg-white/10 rounded-full text-gray-300 transition-colors"
            >
              <MdRefresh className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
      {selectionMessage && selectedEmails.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400 bg-red-900/20 backdrop-blur-sm px-4 py-2 border-t border-white/5"
        >
          {selectionMessage}
        </motion.div>
      )}
    </div>
  );
};

export default FolderToolbar;