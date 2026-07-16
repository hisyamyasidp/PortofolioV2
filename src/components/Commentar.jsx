import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { MessageCircle, UserCircle2, Send, Pin } from 'lucide-react';
import AOS from "aos";
import "aos/dist/aos.css";
import { staticComments } from '../data/portfolioData';

const Comment = memo(({ comment, formatDate, index, isPinned = false }) => (
    <div
        className={`px-4 pt-4 pb-2 rounded-xl border transition-all group hover:shadow-lg hover:-translate-y-0.5 ${
            isPinned
                ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30 hover:bg-gradient-to-r hover:from-indigo-500/15 hover:to-purple-500/15'
                : 'bg-white/5 border-white/10 hover:bg-white/10'
        }`}
    >
        {isPinned && (
            <div className="flex items-center gap-2 mb-3 text-indigo-400">
                <Pin className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Pinned Comment</span>
            </div>
        )}
        <div className="flex items-start gap-3">
            {comment.profile_image ? (
                <img
                    src={comment.profile_image}
                    alt={`${comment.user_name}'s profile`}
                    className={`w-10 h-10 rounded-full object-cover border-2 flex-shrink-0  ${
                        isPinned ? 'border-indigo-500/50' : 'border-indigo-500/30'
                    }`}
                    loading="lazy"
                />
            ) : (
                <div className={`p-2 rounded-full text-indigo-400 group-hover:bg-indigo-500/30 transition-colors ${
                    isPinned ? 'bg-indigo-500/30' : 'bg-indigo-500/20'
                }`}>
                    <UserCircle2 className="w-5 h-5" />
                </div>
            )}
            <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-medium truncate ${
                            isPinned ? 'text-indigo-200' : 'text-white'
                        }`}>
                            {comment.user_name}
                        </h4>
                        {isPinned && (
                            <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-300 rounded-full">
                                Pinned
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(comment.created_at)}
                    </span>
                </div>
                <p className="text-gray-300 text-sm break-words leading-relaxed relative bottom-2">
                    {comment.content}
                </p>
            </div>
        </div>
    </div>
));

const CommentForm = memo(({ onSubmit, isSubmitting, error }) => {
    const [newComment, setNewComment] = useState('');
    const [userName, setUserName] = useState('');
    const textareaRef = useRef(null);

    const handleTextareaChange = useCallback((e) => {
        setNewComment(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!newComment.trim() || !userName.trim()) return;
        onSubmit({ newComment, userName });
        setNewComment('');
        setUserName('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }, [newComment, userName, onSubmit]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2" data-aos="fade-up" data-aos-duration="1000">
                <label className="block text-sm font-medium text-white">
                    Name <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    maxLength={15}
                    placeholder="Enter your name"
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                />
            </div>

            <div className="space-y-2" data-aos="fade-up" data-aos-duration="1200">
                <label className="block text-sm font-medium text-white">
                    Message <span className="text-red-400">*</span>
                </label>
                <textarea
                    ref={textareaRef}
                    value={newComment}
                    maxLength={200}
                    onChange={handleTextareaChange}
                    placeholder="Write your message here..."
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none min-h-[120px]"
                    required
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                data-aos="fade-up" data-aos-duration="1000"
                className="relative w-full h-12 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-xl font-medium text-white overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
                <div className="absolute inset-0 bg-white/20 translate-y-12 group-hover:translate-y-0 transition-transform duration-300" />
                <div className="relative flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Sending...' : 'Send via Email'}</span>
                </div>
            </button>
            {error && (
                <p className="text-xs text-center text-gray-400">{error}</p>
            )}
        </form>
    );
});

const Komentar = () => {
    const [localComments, setLocalComments] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const pinnedComment = staticComments.find(c => c.is_pinned);
    const regularComments = staticComments.filter(c => !c.is_pinned);

    useEffect(() => {
        AOS.init({
            once: false,
            duration: 1000,
        });
    }, []);

    const handleCommentSubmit = useCallback(async ({ newComment, userName }) => {
        setError('');
        setSuccessMsg('');
        setIsSubmitting(true);

        // Send via formsubmit.co (no server needed)
        try {
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = 'https://formsubmit.co/ajax/hisyamyasidp@gmail.com';

            const fields = {
                name: userName,
                message: newComment,
                _subject: 'New Portfolio Comment',
                _captcha: 'false',
            };

            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });

            // Use fetch-based approach for AJAX
            const response = await fetch('https://formsubmit.co/ajax/hisyamyasidp@gmail.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ name: userName, message: newComment, _subject: 'New Portfolio Comment' }),
            });

            // Add comment locally for instant feedback
            const newEntry = {
                id: Date.now(),
                user_name: userName,
                content: newComment,
                created_at: new Date().toISOString(),
                profile_image: null,
                is_pinned: false,
            };
            setLocalComments(prev => [newEntry, ...prev]);
            setSuccessMsg('Comment submitted! 🎉');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            // Even if formsubmit fails, show locally
            const newEntry = {
                id: Date.now(),
                user_name: userName,
                content: newComment,
                created_at: new Date().toISOString(),
                profile_image: null,
                is_pinned: false,
            };
            setLocalComments(prev => [newEntry, ...prev]);
            setSuccessMsg('Comment added! 🎉');
            setTimeout(() => setSuccessMsg(''), 3000);
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const formatDate = useCallback((timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }, []);

    const allComments = [...localComments, ...regularComments];
    const totalComments = allComments.length + (pinnedComment ? 1 : 0);

    return (
        <div className="w-full bg-gradient-to-b from-white/10 to-white/5 rounded-2xl  backdrop-blur-xl shadow-xl" data-aos="fade-up" data-aos-duration="1000">
            <div className="p-6 border-b border-white/10" data-aos="fade-down" data-aos-duration="800">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/20">
                        <MessageCircle className="w-6 h-6 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                        Comments <span className="text-indigo-400">({totalComments})</span>
                    </h3>
                </div>
            </div>
            <div className="p-6 space-y-6">
                {successMsg && (
                    <div className="flex items-center gap-2 p-4 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-sm">{successMsg}</p>
                    </div>
                )}

                <div>
                    <CommentForm onSubmit={handleCommentSubmit} isSubmitting={isSubmitting} error={error} />
                </div>

                <div className="space-y-4 h-[328px] overflow-y-auto overflow-x-hidden custom-scrollbar pt-1 pr-1 " data-aos="fade-up" data-aos-delay="200">
                    {/* Pinned Comment */}
                    {pinnedComment && (
                        <div data-aos="fade-down" data-aos-duration="800">
                            <Comment
                                comment={pinnedComment}
                                formatDate={formatDate}
                                index={0}
                                isPinned={true}
                            />
                        </div>
                    )}

                    {/* Regular Comments */}
                    {allComments.length === 0 && !pinnedComment ? (
                        <div className="text-center py-8" data-aos="fade-in">
                            <UserCircle2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-50" />
                            <p className="text-gray-400">No comments yet. Start the conversation!</p>
                        </div>
                    ) : (
                        allComments.map((comment, index) => (
                            <Comment
                                key={comment.id}
                                comment={comment}
                                formatDate={formatDate}
                                index={index + (pinnedComment ? 1 : 0)}
                                isPinned={false}
                            />
                        ))
                    )}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(99, 102, 241, 0.5);
                    border-radius: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(99, 102, 241, 0.7);
                }
            `}</style>
        </div>
    );
};

export default Komentar;