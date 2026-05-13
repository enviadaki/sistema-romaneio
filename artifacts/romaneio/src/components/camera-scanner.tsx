import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, XCircle, Loader2 } from "lucide-react";

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScannedRef = useRef<string>("");
  const cancelledRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const stopAll = useCallback(() => {
    cancelledRef.current = true;
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch (_) { /* ignore */ }
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
  }, []);

  useEffect(() => {
    if (!open) {
      stopAll();
      return;
    }

    // Reset for new open
    cancelledRef.current = false;
    lastScannedRef.current = "";
    setStatus("loading");
    setErrorMsg(null);

    const start = async () => {
      // Give the Dialog time to fully render the <video> element
      await new Promise<void>((r) => setTimeout(r, 350));
      if (cancelledRef.current) return;

      const video = videoRef.current;
      if (!video) {
        setStatus("error");
        setErrorMsg("Elemento de vídeo não encontrado.");
        return;
      }

      // Request camera — prefer back camera on mobile
      let stream: MediaStream;
      try {
        try {
          // First try environment (back camera)
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
            audio: false,
          });
        } catch {
          // Fallback to any camera
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      } catch (err) {
        if (cancelledRef.current) return;
        const e = err as DOMException;
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setErrorMsg("Permissão de câmera negada. Ative nas configurações do navegador.");
        } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
          setErrorMsg("Nenhuma câmera encontrada no dispositivo.");
        } else {
          setErrorMsg(`Erro ao acessar câmera: ${e.message || e.name}`);
        }
        setStatus("error");
        return;
      }

      if (cancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;

      try {
        await video.play();
      } catch (err) {
        if (cancelledRef.current) return;
        setErrorMsg("Não foi possível iniciar o vídeo da câmera.");
        setStatus("error");
        return;
      }

      if (cancelledRef.current) return;
      setStatus("ready");

      // Start ZXing barcode detection
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      try {
        await reader.decodeFromStream(stream, video, (result, err) => {
          if (cancelledRef.current) return;
          if (result) {
            const code = result.getText();
            if (code === lastScannedRef.current) return;
            lastScannedRef.current = code;
            onScan(code);
            // Cooldown prevents double-scan of the same label
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
            cooldownRef.current = setTimeout(() => {
              lastScannedRef.current = "";
            }, 2500);
          }
          // NotFoundException = no barcode visible yet, safe to ignore
          if (err && !(err instanceof NotFoundException)) {
            console.warn("[CameraScanner] decode error:", err);
          }
        });
      } catch (err) {
        if (cancelledRef.current) return;
        console.warn("[CameraScanner] reader error:", err);
      }
    };

    start();

    return () => {
      stopAll();
    };
  }, [open, onScan, stopAll]);

  const handleClose = () => {
    stopAll();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Escanear via Câmera
          </DialogTitle>
        </DialogHeader>

        {/* Video area — always rendered so the ref is available */}
        <div className="relative bg-black aspect-[4/3] w-full overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Loading overlay */}
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="text-sm">Iniciando câmera...</p>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white px-6 text-center">
              <XCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}

          {/* Aim frame — only when camera is running */}
          {status === "ready" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-40">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-sm" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-sm" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-sm" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-sm" />
                <div className="animate-scan-line left-2 right-2 h-0.5 bg-red-400/80" />
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-center text-muted-foreground">
            {status === "ready"
              ? "Aponte para o código de barras do pacote"
              : status === "loading"
              ? "Aguardando permissão de câmera..."
              : "Verifique as permissões e tente novamente"}
          </p>
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
