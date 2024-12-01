"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ToastContainer, toast, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from 'next/image';
import Link from 'next/link'
import { HiOutlineMail, HiOutlineUser } from 'react-icons/hi'
import { RiLockPasswordLine, RiUserAddLine } from 'react-icons/ri'
import { BsPhone } from 'react-icons/bs'
import { signIn } from "next-auth/react";

const FormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const form = useForm({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const showToast = {
    success: (message) => toast.success(message, {
      position: "bottom-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      style: {
        background: "rgba(16, 185, 129, 0.95)",
        backdropFilter: "blur(8px)",
        color: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      },
      icon: "🎉",
    }),
    error: (message) => toast.error(message, {
      position: "bottom-right",
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      style: {
        background: "rgba(239, 68, 68, 0.95)",
        backdropFilter: "blur(8px)",
        color: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 16px rgba(239, 68, 68, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
      },
      icon: "⚠️",
    })
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  // Add debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Check username availability
  const checkUsername = debounce(async (username) => {
    if (username.length < 3) return;
    
    setCheckingUsername(true);
    try {
      const response = await fetch(`/api/auth/check-username?username=${username}`);
      const data = await response.json();
      
      if (!data.available) {
        setUsernameSuggestions(data.suggestions);
      } else {
        setUsernameSuggestions([]);
      }
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  }, 500);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      // Auto login after successful signup
      const loginResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });

      if (loginResult.error) {
        throw new Error(loginResult.error);
      }

      showToast.success("Account created successfully!");
      window.location.href = '/dashboard';
      
    } catch (error) {
      showToast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        limit={3}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        transition={Bounce}
      />
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-2 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.01 }}
          className="backdrop-blur-xl bg-white/10 shadow-2xl rounded-3xl p-6 border border-white/20"
        >
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Create Account</h2>
            <p className="text-gray-300 text-xs mt-0.5">Join us today!</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {[
                { 
                  name: "name", 
                  label: "Full Name", 
                  type: "text",
                  icon: <HiOutlineUser size={20} />
                },
                { 
                  name: "email", 
                  label: "Email Address", 
                  type: "email",
                  icon: <HiOutlineMail size={20} />
                },
                { 
                  name: "username", 
                  label: "Username", 
                  type: "text",
                  icon: <HiOutlineUser size={20} />,
                  render: (field) => (
                    <div className="relative">
                      <input
                        {...register("username", {
                          onChange: (e) => {
                            checkUsername(e.target.value);
                          }
                        })}
                        type="text"
                        placeholder="Enter username"
                        className="w-full p-2.5 pl-10 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/5 backdrop-blur-sm transition-all duration-200 placeholder-gray-400 text-white text-sm"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {field.icon}
                      </span>
                      {checkingUsername && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </span>
                      )}
                      {usernameSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
                          <div className="p-2 text-sm text-gray-300">
                            Username taken. Try these:
                            <div className="flex flex-col gap-1 mt-1">
                              {usernameSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  className="p-2 text-left hover:bg-gray-700 rounded transition-colors"
                                  onClick={() => {
                                    form.setValue("username", suggestion);
                                    setUsernameSuggestions([]);
                                  }}
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                },
                { 
                  name: "password", 
                  label: "Password", 
                  type: "password", 
                  className: "col-span-2",
                  icon: <RiLockPasswordLine size={20} />
                },
                { 
                  name: "confirmPassword", 
                  label: "Confirm Password", 
                  type: "password", 
                  className: "col-span-2",
                  icon: <RiLockPasswordLine size={20} />
                },
              ].map((field) => (
                <motion.div
                  key={field.name}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className={field.className}
                >
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    {field.label}
                  </label>
                  <div className="relative">
                    {field.render ? 
                      field.render(field) : 
                      <input
                        {...register(field.name)}
                        type={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        className="w-full p-2.5 pl-10 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/5 backdrop-blur-sm transition-all duration-200 placeholder-gray-400 text-white text-sm"
                      />
                    }
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {field.icon}
                    </span>
                    {errors[field.name] && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-1"
                      >
                        {errors[field.name].message}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/20 disabled:opacity-70 mt-4 text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <RiUserAddLine size={18} />
                  Create Account
                </span>
              )}
            </motion.button>

            <p className="text-center text-xs text-gray-300 mt-3">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;