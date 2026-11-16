import { useState } from "react";
import type { ImageItem } from "../lib/types";
import { content } from "../content";
import { postImageFeedback } from "../lib/api";

const MAX_LENGTH = 2000;

export function CommentScreen({
  participantId, image, imageNumber, total, onContinue,
}: {
  participantId: string;
  image: ImageItem;
  imageNumber: number;
  total: number;
  onContinue: () => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [finishError, setFinishError] = useState(false);
  const trimmed = comment.trim();

  const next = async (sendComment: boolean) => {
    if (isSending) return;
    setIsSending(true);
    setSendError(false);
    setFinishError(false);
    if (sendComment) {
      if (!trimmed) { setIsSending(false); return; }
      try {
        await postImageFeedback(participantId, image.id, trimmed);
      } catch (err) {
        console.error("Error enviando comentario de imagen:", err);
        setSendError(true);
        setIsSending(false);
        return;
      }
    }
    try {
      await onContinue();
    } catch (err) {
      console.error("Error continuando el estudio:", err);
      setFinishError(true);
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <p className="text-sm mb-3" style={{ color: "var(--muted-foreground)" }}>
          {content.annotation.imageOf(imageNumber, total)}
        </p>
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
        <div className="text-xs text-right mt-1 mb-5" style={{ fontFamily: "'DM Mono', monospace", color: "var(--muted-foreground)" }}>
          {comment.length} / {MAX_LENGTH}
        </div>
        {(sendError || finishError) && (
          <p role="alert" className="text-sm mb-4" style={{ color: "var(--destructive, #c0392b)" }}>
            {sendError ? content.comment.sendError : content.comment.finishError}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => void next(true)}
            disabled={!trimmed || isSending}
            className="flex-1 py-3.5 text-sm font-medium rounded-sm transition-opacity duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            {isSending ? content.comment.sending : content.comment.send}
          </button>
          <button
            onClick={() => void next(false)}
            disabled={isSending}
            className="flex-1 py-3.5 text-sm font-medium rounded-sm disabled:opacity-30"
            style={{ border: "1px solid var(--border)", background: "var(--card)", color: "var(--foreground)" }}
          >
            {content.comment.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
