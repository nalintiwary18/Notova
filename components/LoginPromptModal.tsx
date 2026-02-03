'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface LoginPromptModalProps {
    isOpen: boolean
    onClose: () => void
    feature?: string
}

export default function LoginPromptModal({ isOpen, onClose, feature = 'this feature' }: LoginPromptModalProps) {
    const router = useRouter()

    const handleLogin = () => {
        onClose()
        router.push('/login')
    }

    const handleSignup = () => {
        onClose()
        router.push('/signup')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
                    >
                        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="relative p-6 pb-4">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 mx-auto mb-4">
                                    <Lock className="w-7 h-7 text-purple-400" />
                                </div>

                                <h2 className="text-xl font-bold text-white text-center">
                                    Sign in required
                                </h2>
                                <p className="text-gray-400 text-center mt-2 text-sm">
                                    You need to sign in to use {feature}. Create a free account to unlock all features.
                                </p>
                            </div>

                            {/* Features list */}
                            <div className="px-6 pb-4">
                                <div className="bg-gray-900/50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Save and access your chat history
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Edit documents with AI
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-300">
                                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Download documents as PDF
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-6 pt-2 space-y-3">
                                <button
                                    onClick={handleLogin}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
                                >
                                    <LogIn className="w-5 h-5" />
                                    Sign in
                                </button>

                                <button
                                    onClick={handleSignup}
                                    className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200"
                                >
                                    Create free account
                                </button>

                                <button
                                    onClick={onClose}
                                    className="w-full py-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
                                >
                                    Maybe later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
