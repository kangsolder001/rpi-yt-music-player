import React, { useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';

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

  const handleClear = () => {
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Cari lagu di YouTube Music atau paste link..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition shadow-inner"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-3 p-1 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="px-4 sm:px-5 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-xs rounded-2xl shadow-lg shadow-red-600/30 transition flex items-center gap-1.5 shrink-0 disabled:opacity-40"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        <span>Cari</span>
      </button>
    </form>
  );
};
