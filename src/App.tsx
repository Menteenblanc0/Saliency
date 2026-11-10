import { useState, useEffect, useCallback, useRef } from "react";
import type { Screen, ImageItem, Stroke } from "./lib/types";
import {
  fetchImages,
  identifyParticipant,
  postComplete,
  ApiError,
  type ParticipantState,
} from "./lib/api";
import { loadParticipantId, saveParticipantId, clearSession } from "./lib/session";
import { PRIVACY, privacyIsComplete } from "./privacy";
import { LoadingScreen, ErrorScreen } from "./components/StatusScreens";
import { IntroScreen } from "./screens/IntroScreen";
import { EmailScreen, type IdentifyInfo } from "./screens/EmailScreen";
import { AnnotationScreen } from "./screens/AnnotationScreen";
import { RatingScreen } from "./screens/RatingScreen";
import { PauseScreen } from "./screens/PauseScreen";
import { TransitionScreen } from "./screens/TransitionScreen";
import { CommentScreen } from "./screens/CommentScreen";
import { CompleteScreen } from "./screens/CompleteScreen";

// Lo que el servidor sabe de este participante, combinado con el catálogo.
interface Participant {
  participantId: string;
  ordered: ImageItem[]; // imágenes en el orden decidido por el servidor
  done: Set<string>; // ids con anotación ya guardada
  completed: boolean;
}

interface Target {
  screen: "annotation" | "comment" | "complete";
  index: number;
}

// Ordena el catálogo con el `order` del servidor. Se descartan los ids que ya no
// están en el catálogo y las imágenes que el servidor aún no conoce van al final.
function buildParticipant(catalog: ImageItem[], state: ParticipantState): Participant {
  const byId = new Map(catalog.map((img) => [img.id, img]));
  const ordered: ImageItem[] = [];
  const used = new Set<string>();
  for (const id of state.order) {
    const img = byId.get(id);
    if (img && !used.has(id)) {
      ordered.push(img);
      used.add(id);
    }
  }
  for (const img of catalog) if (!used.has(img.id)) ordered.push(img);
  return {
    participantId: state.participantId,
    ordered,
    done: new Set(state.doneImageIds.filter((id) => byId.has(id))),
    completed: state.completed,
  };
}

// Primera posición, desde `from`, cuya imagen aún no tiene anotación (-1 si no hay).
function findNextPending(ordered: ImageItem[], done: Set<string>, from: number): number {
  for (let i = from; i < ordered.length; i++) if (!done.has(ordered[i].id)) return i;
  return -1;
}

const countDone = (p: Participant) => p.ordered.filter((img) => p.done.has(img.id)).length;

// Dónde debe seguir la persona: la final si ya terminó, el comentario si hizo
// todas las imágenes, o la primera imagen pendiente.
function targetFor(p: Participant): Target {
  if (p.completed) return { screen: "complete", index: 0 };
  const index = findNextPending(p.ordered, p.done, 0);
  return index === -1 ? { screen: "comment", index: 0 } : { screen: "annotation", index };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [imageIndex, setImageIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(0);
  const [catalog, setCatalog] = useState<ImageItem[] | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Trazos (ya normalizados) de la imagen actual, a la espera de la calificación.
  const [pendingStrokes, setPendingStrokes] = useState<Stroke[] | null>(null);
  // Destino calculado al ingresar el correo; se usa al pulsar "Continuar".
  const targetRef = useRef<Target | null>(null);

  const boot = useCallback(async () => {
    setLoadError(false);
    setCatalog(null);
    try {
      const images = await fetchImages();
      const savedId = loadParticipantId();
      if (savedId) {
        // Pestaña ya identificada (recarga): se retoma sin volver a pedir el correo.
        try {
          const p = buildParticipant(images, await identifyParticipant({ participantId: savedId }));
          const target = targetFor(p);
          setParticipant(p);
          setImageIndex(target.index);
          setScreen(target.screen);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) clearSession(); // id desconocido
          else throw err;
        }
      }
      setCatalog(images);
    } catch (err) {
      console.error("No se pudo cargar el estudio:", err);
      setLoadError(true);
    }
  }, []);

  useEffect(() => {
    if (!privacyIsComplete()) {
      console.warn("Falta completar el responsable y el contacto del aviso de datos en src/privacy.ts");
    }
    boot();
  }, [boot]);

  // Registra o reconoce el correo en el servidor y calcula dónde seguir.
  const handleIdentify = async (email: string): Promise<IdentifyInfo> => {
    const p = buildParticipant(catalog!, await identifyParticipant({ email, consent: true, consentVersion: PRIVACY.version }));
    saveParticipantId(p.participantId);
    setParticipant(p);
    const target = targetFor(p);
    targetRef.current = target;
    const done = countDone(p);
    return {
      showResume: target.screen === "annotation" && done > 0,
      done,
      total: p.ordered.length,
      startNumber: target.index + 1,
    };
  };

  const handleEmailContinue = () => {
    const target = targetRef.current;
    if (!target) return;
    setImageIndex(target.index);
    setScreen(target.screen);
  };

  // Pasa a la siguiente imagen pendiente o, si no queda ninguna, al comentario.
  // Se llama cuando el servidor confirmó el guardado (saved) o al saltar una
  // imagen que no carga (no se guarda y seguirá pendiente).
  const goToNextImage = (saved: boolean) => {
    if (!participant) return;
    setPendingStrokes(null);
    const done = new Set(participant.done);
    if (saved) done.add(participant.ordered[imageIndex].id);
    setParticipant({ ...participant, done });
    const next = findNextPending(participant.ordered, done, imageIndex + 1);
    if (next === -1) {
      setScreen("comment");
      return;
    }
    setNextIndex(next);
    setScreen("transition");
    setTimeout(() => {
      setImageIndex(next);
      setScreen("annotation");
    }, 900);
  };

  // Terminó de dibujar: no se guarda todavía, primero va la calificación.
  const handleAnnotationDone = (strokes: Stroke[]) => {
    setPendingStrokes(strokes);
    setScreen("rating");
  };

  // Pausa: se olvida al participante en este navegador; el progreso queda en el servidor.
  const handlePause = () => {
    clearSession();
    setPendingStrokes(null);
    setScreen("pause");
  };

  const handleBackHome = () => {
    setParticipant(null);
    targetRef.current = null;
    setImageIndex(0);
    setScreen("intro");
  };

  // Cierra la encuesta: el servidor la marca completada (al volver a ingresar con
  // el correo se verá la pantalla final) y el navegador olvida al participante.
  const handleFinish = async () => {
    if (!participant) return;
    await postComplete(participant.participantId);
    clearSession();
    setParticipant({ ...participant, completed: true });
    setScreen("complete");
  };

  if (loadError) {
    return (
      <div className="size-full">
        <ErrorScreen onRetry={boot} />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="size-full">
        <LoadingScreen />
      </div>
    );
  }

  const ordered = participant?.ordered ?? [];
  const total = ordered.length;
  // Las pantallas que necesitan al participante vuelven a la intro si no existe.
  const view: Screen = !participant && !["intro", "email"].includes(screen) ? "intro" : screen;

  return (
    <div className="size-full">
      {view === "intro" && <IntroScreen onStart={() => setScreen("email")} total={catalog.length} />}
      {view === "email" && <EmailScreen onIdentify={handleIdentify} onContinue={handleEmailContinue} />}
      {view === "annotation" && participant && (
        <AnnotationScreen
          imageIndex={imageIndex}
          onDone={handleAnnotationDone}
          onSkip={() => goToNextImage(false)}
          onPause={handlePause}
          images={ordered}
          total={total}
        />
      )}
      {view === "rating" && participant && pendingStrokes && (
        <RatingScreen
          image={ordered[imageIndex]}
          strokes={pendingStrokes}
          participantId={participant.participantId}
          onSaved={() => goToNextImage(true)}
          onPause={handlePause}
        />
      )}
      {view === "pause" && participant && (
        <PauseScreen done={countDone(participant)} total={total} onBack={handleBackHome} />
      )}
      {view === "transition" && participant && (
        <TransitionScreen current={countDone(participant)} next={nextIndex + 1} total={total} />
      )}
      {view === "comment" && participant && (
        <CommentScreen participantId={participant.participantId} onFinish={handleFinish} />
      )}
      {view === "complete" && <CompleteScreen total={total || catalog.length} />}
    </div>
  );
}
