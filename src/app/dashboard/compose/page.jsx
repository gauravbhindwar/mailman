'use client'
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { sendEmailAction } from './actions';
import ComposeEmail from '../../../components/Dashboard/ComposeEmail';

export default function ComposePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.error('Please sign in to send emails');
      return;
    }

    if (!to || !subject || !content) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSending(true);
    const toastId = toast.loading('Sending email...');

    try {
      const formData = {
        userId: session.user.id,
        from: session.user.email,
        to,
        subject,
        content
      };

      const result = await sendEmailAction(formData);
      
      if (result.success) {
        toast.success('Email sent successfully!', { id: toastId });
        router.push('/dashboard/sent');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(
        error.message || 'Failed to send email. Please check your email settings.',
        { id: toastId }
      );
      console.error('Email Send Error:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full">
      <h2 className="text-xl font-bold p-4">Compose Email</h2>
      <ComposeEmail />
    </div>
  );
}