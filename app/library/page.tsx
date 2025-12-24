'use client';

import { useEffect, useState } from 'react';
import { PostCard } from '@/components/PostCard';
import { Select } from '@/components/ui/select';
import { Library as LibraryIcon, FileText } from 'lucide-react';

export default function Library() {
  const [posts, setPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  async function fetchPosts() {
    try {
      const url = filter === 'all' ? '/api/posts' : `/api/posts?status=${filter}`;
      const response = await fetch(url);
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Library</h1>
            <p className="text-sm text-muted-foreground mt-1">All your generated posts</p>
          </div>
          <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Posts</option>
            <option value="unposted">Unposted</option>
            <option value="posted">Posted</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-muted-foreground">No posts found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post: any) => (
            <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
          ))}
        </div>
      )}
    </div>
  );
}
