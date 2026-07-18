import { IoSearch, IoClose } from "react-icons/io5";

function MessageSearch({ searchQuery, setSearchQuery, messageCount }) {
  return (
    <div className="px-3 py-2 border-b border-white/5">
      <div className="relative group">
        <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-300"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            <IoClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="text-[10px] text-gray-500 mt-1">
          {messageCount} {messageCount === 1 ? "message" : "messages"} found
        </p>
      )}
    </div>
  );
}

export default MessageSearch;
