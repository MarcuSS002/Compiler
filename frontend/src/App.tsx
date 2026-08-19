import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

type Language = "cpp" | "js" | "python";

const LANGUAGE_LABELS: Record<Language, string> = {
  cpp: "C++",
  js: "JavaScript",
  python: "Python",
};

function App() {
  const [status, setStatus] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("cpp");
  const [loading, setLoading] = useState(false);

  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

async function pollBackend(submissionId: string) {
  const response = await axios.get(`${BACKEND_URL}/submission/${submissionId}`);
  const data = response.data;

  if (data.status !== "pending") {          // worker sets: accepted | tle | error
    setStatus(data.status);
    setOutput(data.output);
    setLoading(false);
  } else {
    await new Promise((r) => setTimeout(r, 3000));
    await pollBackend(submissionId);
  }
}

  async function handleRun() {
    setLoading(true);
    setStatus("Processing...");
    setOutput(null);
    try {
      const response = await axios.post(`${BACKEND_URL}/submission`, {
        questionId: 1,
        code: textAreaRef.current!.value,
        language,
      });
      // FIX: was response.id — axios wraps in .data
      await pollBackend(response.data.id);
    } catch (err) {
      setStatus("Error");
      setOutput("Failed to reach the server. Is the backend running?");
      setLoading(false);
    }
  }

  const isAccepted = status?.toLowerCase() === "accepted";   // was strict "Accepted"
const isError = status && !["pending", "accepted"].includes(status.toLowerCase());

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 font-mono overflow-hidden">
      {/* ── Left panel: editor ── */}
      <div className="flex-1 flex flex-col border-r border-slate-800">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
          {/* Language tabs */}
          <div className="flex gap-1">
            {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 text-xs rounded transition-colors font-mono ${
                  language === lang
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white transition-colors"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Running
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>

        {/* Editor */}
        <textarea
          ref={textAreaRef}
          spellCheck={false}
          placeholder={`// Write your ${LANGUAGE_LABELS[language]} code here...`}
          className="flex-1 resize-none bg-slate-950 text-slate-100 text-sm p-4 outline-none placeholder:text-slate-600 leading-relaxed"
        />
      </div>

      {/* ── Right panel: output ── */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Output header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900">
          <span className="text-xs text-slate-400 uppercase tracking-widest">
            Output
          </span>
          {status && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-sans ${
                isAccepted
                  ? "bg-emerald-900/60 text-emerald-400"
                  : isError
                  ? "bg-red-900/60 text-red-400"
                  : "bg-slate-700 text-slate-300"
              }`}
            >
              {status}
            </span>
          )}
        </div>

        {/* Output body */}
        <div className="flex-1 overflow-auto p-4">
          {!status && !output && (
            <p className="text-slate-600 text-sm">
              Run your code to see output here.
            </p>
          )}
          {output && (
            <pre className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {output}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;