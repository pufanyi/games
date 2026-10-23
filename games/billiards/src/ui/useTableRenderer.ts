import { useEffect, useRef, useState } from "react";
import { Renderer } from "../rendering/renderer.ts";
import {
  isActive,
  sameView,
  type Session,
  setPaused,
  update,
  type View,
  viewOf,
} from "../runtime/session.ts";

/** Owns the canvas, camera, animation loop, and GPU recovery for one session. */
export function useTableRenderer(
  session: Session,
  setView: (view: View) => void,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [cameraView, setCameraView] = useState<"table" | "top">("table");
  const cameraViewRef = useRef<"table" | "top">("table");
  const [renderError, setRenderError] = useState(false);
  const [renderAttempt, setRenderAttempt] = useState(0);

  function switchCamera() {
    const next = cameraViewRef.current === "table" ? "top" : "table";
    cameraViewRef.current = next;
    rendererRef.current?.setView(next);
    setCameraView(next);
  }
  // The loop: real time drives the clock and shot playback.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: Renderer;
    try {
      renderer = new Renderer(canvas);
      renderer.setView(cameraViewRef.current);
      rendererRef.current = renderer;
      setRenderError(false);
    } catch {
      setRenderError(true);
      setPaused(session, true);
      return;
    }
    const onLost = (event: Event) => {
      event.preventDefault();
      setPaused(session, true);
      setRenderError(true);
    };
    // Rebuild generated reflection targets after the GPU has lost their contents.
    const onRestored = () => setRenderAttempt((n) => n + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    let frameId = 0;
    let last = performance.now();
    let displayed = viewOf(session);
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      update(session, dt);
      renderer.draw(session, isActive(session) ? dt : 0);
      const next = viewOf(session);
      if (!sameView(displayed, next)) {
        displayed = next;
        setView(next);
      }
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      rendererRef.current = null;
      renderer.dispose();
    };
  }, [session, renderAttempt, setView]);

  return {
    canvasRef,
    rendererRef,
    cameraView,
    switchCamera,
    renderError,
    retryRendering: () => setRenderAttempt((n) => n + 1),
  };
}
