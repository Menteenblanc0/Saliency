import { useState, useEffect, useCallback } from "react";
import type { Screen, ImageItem, Stroke } from "./lib/types";
import { shuffle } from "./lib/shuffle";
import { fetchImages } from "./lib/api";
import { LoadingScreen, ErrorScreen } from "./components/StatusScreens";
import { IntroScreen } from "./screens/IntroScreen";
import { AnnotationScreen } from "./screens/AnnotationScreen";
import { RatingScreen } from "./screens/RatingScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { CommentScreen } from "./screens/CommentScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [imageIndex, setImageIndex] = useState(0);
  const [participantId, setParticipantId] = useState(() => crypto.randomUUID());
  const [images, setImages] = useState<ImageItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Trazos (ya normalizados) de la imagen actual, a la espera de la calificación.
  const [pendingStrokes, setPendingStrokes] = useState<Stroke[] | null>(null);

  const loadImages = useCallback(async () => {
    setLoadError(false);
    setImages(null);
    try {
      // Se mezcla una sola vez aquí, al cargar -- cada participante ve
      // sus imágenes en un orden distinto.
      setImages(shuffle(await fetchImages()));
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
    setImageIndex(0);
    setScreen("annotation");
  };

  // Pasa a la imagen siguiente o, si era la última, al comentario final.
  const goToNextImage = () => {
    setPendingStrokes(null);
    const next = imageIndex + 1;
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

  const handleRestart = () => {
    // Un participante nuevo: con el mismo id, el índice único de la base de
    // datos trataría los guardados como duplicados y no se registraría nada.
    setParticipantId(crypto.randomUUID());
    setImages((prev) => (prev ? shuffle(prev) : prev));
    setPendingStrokes(null);
    setImageIndex(0);
    setScreen("intro");
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
      {screen === "intro" && <IntroScreen onStart={handleStart} total={total} />}
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
        <CommentScreen participantId={participantId} onDone={() => setScreen("complete")} />
      )}
      {screen === "complete" && <CompleteScreen onRestart={handleRestart} total={total} />}
    </div>
  );
}
