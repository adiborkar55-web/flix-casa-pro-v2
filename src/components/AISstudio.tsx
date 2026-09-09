"use client";

import { useState } from "react";
import { Check, Code2, Monitor, Send } from "lucide-react";

export function AISstudio() {
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState("// Generated code appears here");
  const [approved, setApproved] = useState(false);

  const generate = () => {
    if (!prompt.trim()) return;
    setPreview(`// Review-only proposal\n// Request: ${prompt.trim()}\n\nexport const approvedChange = false;`);
    setApproved(false);
  };

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Code2 className="h-5 w-5 text-cyan-300" /> AI Studio</h2><p className="mt-1 text-sm text-zinc-400">Generate a review-only proposal. Nothing is applied without approval.</p></div><button type="button" onClick={() => setApproved((value) => !value)} className={`flex items-center gap-2 rounded px-3 py-2 text-sm ${approved ? "bg-green-700" : "bg-zinc-700"}`}>{approved && <Check className="h-4 w-4" />} {approved ? "Approved" : "Approve change"}</button></div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div><label className="text-xs uppercase tracking-wide text-zinc-500">Prompt terminal<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-2 min-h-36 w-full rounded border border-zinc-700 bg-black p-3 font-mono text-sm text-white outline-none focus:border-cyan-300" placeholder="Request a feature..." /></label><button type="button" onClick={generate} className="mt-2 flex items-center gap-2 rounded bg-cyan-400 px-3 py-2 text-sm font-semibold text-black"><Send className="h-4 w-4" /> Generate</button></div>
        <div className="rounded border border-zinc-800 bg-black p-4"><div className="mb-3 flex items-center gap-2 text-xs text-zinc-400"><Monitor className="h-4 w-4" /> Live preview</div><div className="grid gap-2 text-center text-xs text-zinc-400 sm:grid-cols-3"><div className="rounded bg-zinc-900 p-3">Mobile</div><div className="rounded bg-zinc-900 p-3">Android TV</div><div className="rounded bg-zinc-900 p-3">Laptop</div></div></div>
        <pre className="min-h-36 overflow-auto rounded border border-zinc-800 bg-black p-4 text-xs text-green-300">{preview}</pre>
      </div>
    </section>
  );
}
