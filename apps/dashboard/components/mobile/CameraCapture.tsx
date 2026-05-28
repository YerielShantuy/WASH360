"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, RotateCcw, Check, Loader2 } from "lucide-react";

const spring = { type: "spring" as const, stiffness: 200, damping: 15 };

interface Props {
  open: boolean;
  onCapture: (dataUrl: string, blob: Blob) => void;
  onClose: () => void;
  instruction?: string;
  facingMode?: "user" | "environment";
}

type Stage = "live" | "preview" | "error";

export default function CameraCapture({ open, onCapture, onClose, instruction = "Tap the button to capture", facingMode = "environment" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>("live");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStage("live");
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
      setStage("error");
    } finally {
      setStarting(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (open) {
      setStage("live");
      setPreviewUrl(null);
      setPreviewBlob(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setPreviewBlob(blob);
      setPreviewUrl(dataUrl);
      setStage("preview");
      stopCamera();
    }, "image/jpeg", 0.85);
  }

  function retake() {
    setPreviewUrl(null);
    setPreviewBlob(null);
    startCamera();
  }

  function confirm() {
    if (previewUrl && previewBlob) {
      onCapture(previewUrl, previewBlob);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-black/40 absolute top-0 inset-x-0 z-10">
            <button onClick={onClose} className="p-2 rounded-full bg-black/40 text-white">
              <X size={20} />
            </button>
            <p className="text-white text-sm font-semibold flex-1">{instruction}</p>
          </div>

          {/* Viewfinder */}
          <div className="flex-1 relative overflow-hidden">
            {stage === "live" && (
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                playsInline
                muted
              />
            )}
            {stage === "preview" && previewUrl && (
              <img src={previewUrl} alt="Captured" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {stage === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <Camera size={48} className="text-slate-500" />
                <p className="text-slate-300 text-sm">{error}</p>
                <button onClick={startCamera} className="bg-sky-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
                  Try Again
                </button>
              </div>
            )}
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={36} className="text-white animate-spin" />
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="bg-black/80 pb-10 pt-6 flex items-center justify-center gap-10">
            {stage === "live" && (
              <button
                onClick={capture}
                disabled={starting}
                className="w-18 h-18 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center shadow-lg disabled:opacity-50"
                style={{ width: 72, height: 72 }}
              >
                <div className="w-14 h-14 rounded-full bg-white border-2 border-slate-200" />
              </button>
            )}
            {stage === "preview" && (
              <>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={spring}
                  onClick={retake}
                  className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center"
                >
                  <RotateCcw size={22} className="text-white" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  transition={spring}
                  onClick={confirm}
                  className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg"
                >
                  <Check size={26} className="text-white" strokeWidth={2.5} />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
