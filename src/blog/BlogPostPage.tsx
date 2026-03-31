import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getBlogPost, type BlogPostBlock } from './posts';

function Block({ block }: { block: BlogPostBlock }) {
  switch (block.type) {
    case 'h1':
      return <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{block.text}</h1>;
    case 'h2':
      return <h2 className="text-xl sm:text-2xl font-bold text-white mt-8">{block.text}</h2>;
    case 'h3':
      return <h3 className="text-base sm:text-lg font-bold text-white mt-5">{block.text}</h3>;
    case 'p':
      return <p className="text-sm sm:text-[15px] leading-relaxed text-gray-300">{block.text}</p>;
    case 'ul':
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm sm:text-[15px] text-gray-300">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <div className="border border-[#2A2A2A] rounded-2xl bg-[#0E0E0E] overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between border-b border-[#2A2A2A] bg-[#141414]">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {block.language || 'code'}
            </span>
          </div>
          <pre className="p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed text-gray-200">
            <code>{block.code}</code>
          </pre>
        </div>
      );
    default:
      return null;
  }
}

export function BlogPostPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const post = slug ? getBlogPost(slug) : undefined;

  if (!post) {
    return (
      <div className="min-h-screen bg-[#121212] p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <button
            className="text-[10px] font-bold text-[#E2FF6F] uppercase tracking-widest hover:underline"
            onClick={() => navigate('/blog')}
          >
            ← Back to Blog
          </button>
          <div className="border border-[#2A2A2A] rounded-3xl p-6 bg-[#1A1A1A]">
            <h1 className="text-xl font-bold text-white">Post not found</h1>
            <p className="text-sm text-gray-400 mt-2">That post slug doesn’t exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            className="text-[10px] font-bold text-[#E2FF6F] uppercase tracking-widest hover:underline"
            onClick={() => navigate('/blog')}
          >
            ← Back to Blog
          </button>
          <button
            className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white"
            onClick={() => navigate('/')}
          >
            Go to App
          </button>
        </div>

        <div className="border border-[#2A2A2A] rounded-3xl p-6 sm:p-10 bg-[#1A1A1A] space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#2A2A2A] text-gray-300"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {post.author} • {post.dateISO} • {post.readTime}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {post.blocks.map((b, i) => (
              <React.Fragment key={i}>
                <Block block={b} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

