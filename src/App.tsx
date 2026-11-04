import { useState, useEffect, useCallback } from "react";
import type { Screen, ImageItem } from "./lib/types";
import { shuffle } from "./lib/shuffle";
import { fetchImages } from "./lib/api";
import { LoadingScreen, ErrorScreen } from "./components/StatusScreens";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { AnnotationScreen } from "./screens/AnnotationScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [imageIndex, setImageIndex] = useState(0);
  const [participantId] = useState(() => crypto.randomUUID());
  const [images, setImages] = useState<ImageItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadImages = useCallback(async () => {
    setLoadError(false);
    setImages(null);
    try {
      // Se mezcla una sola vez aquí, al cargar -- cada participante ve
      // sus ~N imágenes en un orden distinto, sin importar cuántas
      // (N) le suministres al estudio más adelante.
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

  const handleNext = () => {
    const next = imageIndex + 1;
    if (next >= total) {
      setScreen("complete");
    } else {
      setScreen("transition");
      setTimeout(() => {
        setImageIndex(next);
        setScreen("annotation");
      }, 900);
    }
  };

  const handleRestart = () => {
    setImageIndex(0);
    setScreen("welcome");
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
      {screen === "welcome" && <WelcomeScreen onStart={handleStart} total={total} />}
      {screen === "annotation" && (
        <AnnotationScreen
          imageIndex={imageIndex}
          onNext={handleNext}
          participantId={participantId}
          images={images}
          total={total}
        />
      )}
      {screen === "transition" && (
        <TransitionScreen current={imageIndex + 1} next={imageIndex + 2} total={total} />
      )}
      {screen === "complete" && <CompleteScreen onRestart={handleRestart} total={total} />}
    </div>
  );
}
