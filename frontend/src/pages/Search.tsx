import { useState } from "react";

export default function Search() {
  const [query, setQuery] = useState("");
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Search Drive</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search files and folders..."
        className="mt-4 w-full rounded-lg border p-3"
      />
      {query && (
        <p className="mt-4 text-sm text-gray-500">
          Searching for “{query}”...
        </p>
      )}
    </div>
  );
}
