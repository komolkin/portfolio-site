"use client";

import { FormEvent, useState } from "react";

type UsernamePromptProps = {
  score: number;
  onSubmit: (username: string) => void;
};

export default function UsernamePrompt({ score, onSubmit }: UsernamePromptProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Enter a username");
      return;
    }
    setError("");
    onSubmit(trimmed);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[220px] space-y-3 text-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-muted-foreground">Score: {score}</p>
        <p className="text-sm text-foreground">Pick a username</p>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          autoFocus
          placeholder="username"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-white/25"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-foreground hover:bg-white/15"
        >
          Save
        </button>
      </form>
    </div>
  );
}
