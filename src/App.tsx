import { useState, useEffect, useCallback } from "react";
import type { Screen, ImageItem, Stroke } from "./lib/types";
import { shuffle } from "./lib/shuffle";
import { fetchImages } from "./lib/api";
import { loadSession, saveSession, clearSession, applySession } from "./lib/session";
import { LoadingScreen, ErrorScreen } from "./components/StatusScreens";
import { IntroScreen } from "./screens/IntroScreen";
import { AnnotationScreen } from "./screens/AnnotationScreen";
import { RatingScreen } from "./screens/RatingScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { CommentScreen } from "./screens/CommentScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

// Guarda el progreso para poder retomar tras recargar. Solo guarda un UUID,
// ids de imagen y el avance; el dibujo en curso nunca se persiste.
function persist(images: ImageItem[], participantId: string, index: number, completed = false) {
  saveSession({
    participantId,
    order: images.map((img) => img.id),
    index,
    introSeen: true,
    completed,
  });
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [imageIndex, setImageIndex] = useState(0);
  const [participantId, setParticipantId] = useState<string>(() => crypto.randomUUID());
  const [images, setImages] = useState<ImageItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Trazos (ya normalizados) de la imagen actual, a la espera de la calificación.
  const [pendingStrokes, setPendingStrokes] = useState<Stroke[] | null>(null);

  const loadImages = useCallback(async () => {
    setLoadError(false);
    setImages(null);
    try {
      // Cada participante ve las imágenes en un orden distinto: se mezcla
      // aquí, salvo que haya una sesión guardada, que conserva su orden.
      const fetched = shuffle(await fetchImages());
      const saved = loadSession();
      if (!saved) {
        setImages(fetched);
        return;
      }
      const { ordered, index } = applySession(fetched, saved);
      setImages(ordered);
      setParticipantId(saved.participantId);
      setImageIndex(index);
      setScreen(saved.completed ? "complete" : index >= ordered.length ? "comment" : "intro");
      // Se guarda el orden ya reconciliado para que no cambie en la próxima recarga.
      saveSession({ ...saved, order: ordered.map((img) => img.id), index });
    } catch (err) {
      console.error("No se pudieron cargar las imágenes:", err);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const total = images?.length ?? 0;

  const handleStart = () => {
    if (!images) return;
    persist(images, participantId, 0);
    setImageIndex(0);
    setScreen("annotation");
  };

  // Retoma en la imagen pendiente (imageIndex ya viene de la sesión guardada).
  const handleContinue = () => setScreen("annotation");

  // "Empezar de nuevo": borra lo guardado y arranca como un participante nuevo.
  // Con el mismo id, el servidor trataría los guardados como duplicados.
  const handleRestartSession = () => {
    clearSession();
    setParticipantId(crypto.randomUUID());
    setImages((prev) => (prev ? shuffle(prev) : prev));
    setPendingStrokes(null);
    setImageIndex(0);
    setScreen("intro");
  };

  // Pasa a la imagen siguiente o, si era la última, al comentario final.
  // Se llama cuando el servidor confirmó el guardado (o al saltar una imagen
  // que no carga), y solo entonces avanza el índice guardado.
  const goToNextImage = () => {
    if (!images) return;
    setPendingStrokes(null);
    const next = imageIndex + 1;
    persist(images, participantId, next);
    if (next >= total) {
      setScreen("comment");
    } else {
      setScreen("transition");
      setTimeout(() => {
        setImageIndex(next);
        setScreen("annotation");
      }, 900);
    }
  };

  // Terminó de dibujar: no se guarda todavía, primero va la calificación.
  const handleAnnotationDone = (strokes: Stroke[]) => {
    setPendingStrokes(strokes);
    setScreen("rating");
  };

  // Cierra la encuesta: al recargar se mostrará la pantalla final, sin
  // permitir otra pasada con el mismo participante.
  const handleCommentDone = () => {
    if (images) persist(images, participantId, images.length, true);
    setScreen("complete");
  };

  if (loadError) {
    return (
      <div className="size-full">
        <ErrorScreen onRetry={loadImages} />
      </div>
    );
  }

  if (!images) {
    return (
      <div className="size-full">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="size-full">
      {screen === "intro" && (
        <IntroScreen
          onStart={handleStart}
          onContinue={handleContinue}
          onRestart={handleRestartSession}
          total={total}
          resumeIndex={imageIndex}
        />
      )}
      {screen === "annotation" && (
        <AnnotationScreen
          imageIndex={imageIndex}
          onDone={handleAnnotationDone}
          onSkip={goToNextImage}
          images={images}
          total={total}
        />
      )}
      {screen === "rating" && pendingStrokes && (
        <RatingScreen
          image={images[imageIndex]}
          strokes={pendingStrokes}
          participantId={participantId}
          onSaved={goToNextImage}
        />
      )}
      {screen === "transition" && (
        <TransitionScreen current={imageIndex + 1} next={imageIndex + 2} total={total} />
      )}
      {screen === "comment" && (
        <CommentScreen participantId={participantId} onDone={handleCommentDone} />
      )}
      {screen === "complete" && <CompleteScreen total={total} />}
    </div>
  );
}
