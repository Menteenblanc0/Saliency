import { useState } from "react";
import { content } from "../content";
import { postFeedback } from "../lib/api";

const MAX_LENGTH = 2000;

export function CommentScreen({
  participantId,
  onDone,
}: {
  participantId: string;
  onDone: () => void;
}) {
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const trimmed = comment.trim();

  const send = async () => {
    if (!trimmed || isSending) return;
    setIsSending(true);
    setSendError(false);
    try {
      await postFeedback(participantId, trimmed);
      onDone();
    } catch (err) {
      console.error("Error enviando comentario:", err);
      setSendError(true); // "Omitir" sigue disponible
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-light leading-tight mb-3" style={{ letterSpacing: "-0.02em" }}>
          {content.comment.title}
        </h1>
        <p className="text-base leading-relaxed mb-6" style={{ color: "var(--muted-foreground)", fontWeight: 300 }}>
          {content.comment.body}
        </p>

        <textarea
          aria-label={content.comment.label}
          placeholder={content.comment.placeholder}
          value={comment}
          maxLength={MAX_LENGTH}
          rows={6}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 text-base leading-relaxed rounded-sm resize-y"
          style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
        />
        <div
          className="text-xs text-right mt-1 mb-5"
          style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}
        >
          {comment.length} / {MAX_LENGTH}
        </div>

        {sendError && (
          <p role="alert" className="text-sm mb-4" style={{ color: "var(--destructive, #c0392b)" }}>
            {content.comment.sendError}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={send}
            disabled={!trimmed || isSending}
            className="flex-1 py-3.5 text-sm font-medium rounded-sm transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {isSending ? content.comment.sending : content.comment.send}
          </button>
          <button
            onClick={onDone}
            className="flex-1 py-3.5 text-sm font-medium rounded-sm"
            style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
          >
            {content.comment.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
