import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from './posts';

export function BlogIndexPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212] p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Blog</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Tutorials and deployment notes. Public pages (no login required).
            </p>
          </div>
          <button
            className="text-[10px] font-bold text-[#E2FF6F] uppercase tracking-widest hover:underline mt-2"
            onClick={() => navigate('/')}
          >
            Go to App →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLOG_POSTS.map((post) => (
            <button
              key={post.slug}
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="text-left border border-[#2A2A2A] rounded-3xl p-6 bg-[#1A1A1A] hover:border-[#E2FF6F]/30 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {post.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2A2A2A] text-gray-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="text-lg font-bold text-white leading-snug">{post.title}</h2>
              <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {post.author} • {post.dateISO} • {post.readTime}
              </div>
              <div className="mt-4 text-[10px] font-bold text-[#E2FF6F] uppercase tracking-widest">
                Read →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

