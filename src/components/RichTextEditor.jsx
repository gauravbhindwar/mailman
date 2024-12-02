"use client"
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill with no SSR
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

// Import styles in a separate useEffect
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    import('react-quill/dist/quill.snow.css');
  }, []);

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  if (!mounted) {
    return (
      <div className="h-64 flex items-center justify-center border rounded bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        className="h-[250px]"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          height: calc(250px - 42px);
          font-size: 16px;
        }
        .rich-text-editor .ql-editor {
          padding: 1rem;
          min-height: 200px;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.375rem;
          border-top-right-radius: 0.375rem;
        }
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.375rem;
          border-bottom-right-radius: 0.375rem;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;