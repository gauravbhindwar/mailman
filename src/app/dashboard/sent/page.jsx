"use client"
import { useSession } from "next-auth/react";
import useSWR from 'swr';
import { motion } from 'framer-motion';
import FolderView from '@/components/Dashboard/FolderView';

export default function SentPage() {
  return <FolderView folder="sent" title="Sent" />;
}