import React, { useState } from 'react';
import { Search, Link as LinkIcon, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Cari lagu di YouTube Music atau paste link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition shadow-inner"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>Cari</span>
      </button>
    </form>
  );
};

