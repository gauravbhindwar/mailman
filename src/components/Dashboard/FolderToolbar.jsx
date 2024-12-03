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
    <div className="sticky top-0 z-10 bg-white border-b">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center p-4"
      >
        <h1 className="text-xl font-bold">{title}</h1>
        
        <div className="flex items-center gap-2">
          {selectedEmails.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-sm text-gray-500">
                {selectedEmails.length} selected
              </span>
              {extraButtons}
              {title !== 'Trash' && (
                <>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdArchive className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdDelete className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MdLabel className="w-5 h-5" />
                  </button>
                </>
              )}
            </motion.div>
          ) : (
            <button 
              onClick={onRefresh}
              className="p-2 hover:bg-gray-100 rounded-full"
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
          className="text-sm text-red-600 bg-red-50 px-4 py-2"
        >
          {selectionMessage}
        </motion.div>
      )}
    </div>
  );
};

export default FolderToolbar;