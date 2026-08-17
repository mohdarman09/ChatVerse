import { IoSearch, IoClose } from "react-icons/io5";

function MessageSearch({ searchQuery, setSearchQuery, messageCount }) {
  return (
    <div className="px-3.5 py-2 border-b border-[var(--border-subtle)]">
      <div className="relative group">
        <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] group-focus-within:text-primary transition-colors duration-150" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg pl-8 pr-8 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
          >
            <IoClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-1">
          {messageCount} {messageCount === 1 ? "message" : "messages"} found
        </p>
      )}
    </div>
  );
}

export default MessageSearch;
