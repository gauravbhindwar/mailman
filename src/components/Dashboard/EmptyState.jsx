
import { motion } from 'framer-motion';
import { 
  InboxIcon, 
  PaperAirplaneIcon,
  ArchiveBoxIcon,
  ExclamationCircleIcon,
  TrashIcon 
} from '@heroicons/react/24/outline';

const folderConfig = {
  inbox: {
    icon: InboxIcon,
    title: 'Your inbox is empty',
    description: 'No new messages to display'
  },
  sent: {
    icon: PaperAirplaneIcon,
    title: 'No sent emails',
    description: 'Emails you send will appear here'
  },
  archive: {
    icon: ArchiveBoxIcon,
    title: 'Archive is empty',
    description: 'Archived emails will appear here'
  },
  spam: {
    icon: ExclamationCircleIcon,
    title: 'No spam detected',
    description: 'Spam emails will appear here'
  },
  trash: {
    icon: TrashIcon,
    title: 'Trash is empty',
    description: 'Deleted emails will appear here'
  }
};

const EmptyState = ({ folder }) => {
  const config = folderConfig[folder] || folderConfig.inbox;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-[60vh] text-gray-500"
    >
      <Icon className="w-16 h-16 mb-4" />
      <h3 className="text-xl font-medium mb-2">{config.title}</h3>
      <p className="text-sm text-gray-400">{config.description}</p>
    </motion.div>
  );
};

export default EmptyState;