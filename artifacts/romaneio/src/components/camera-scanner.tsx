import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, FlipHorizontal, XCircle } from "lucide-react";

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const lastScannedRef = useRef<string>("");
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScanning(false);
  }, []);

  // Load available cameras using browser API
  useEffect(() => {
    if (!open) return;

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setCameras(videoDevices);
        if (videoDevices.length > 0) {
          const back = videoDevices.find((d) =>
            /back|rear|environment/i.test(d.label)
          );
          setSelectedCamera(
            back?.deviceId ?? videoDevices[videoDevices.length - 1].deviceId
          );
        } else {
          setError("Nenhuma câmera encontrada.");
        }
      })
      .catch(() => {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      });

    return () => {
      stopScanner();
    };
  }, [open, stopScanner]);

  // Start scanning when camera is selected
  useEffect(() => {
    if (!open || !selectedCamera || !videoRef.current) return;

    setError(null);
    setScanning(true);
    lastScannedRef.current = "";

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(selectedCamera, videoRef.current, (result, err) => {
        if (result) {
          const code = result.getText();
          if (code === lastScannedRef.current) return;

          lastScannedRef.current = code;
          onScan(code);

          if (cooldownRef.current) clearTimeout(cooldownRef.current);
          cooldownRef.current = setTimeout(() => {
            lastScannedRef.current = "";
          }, 2000);
        }
        if (err && !(err instanceof NotFoundException)) {
          // Not a NotFoundException — real error, ignore to avoid flooding
        }
      })
      .catch(() => {
        setError("Erro ao iniciar a câmera. Verifique as permissões do navegador.");
        setScanning(false);
      });

    return () => {
      reader.reset();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [open, selectedCamera, onScan]);

  const handleClose = () => {
    stopScanner();
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

        <div className="relative bg-black aspect-[4/3] w-full overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Crosshair overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-40">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-sm" />
              {scanning && (
                <div className="animate-scan-line left-2 right-2 h-0.5 bg-red-400/80" />
              )}
            </div>
          </div>

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-white px-6 text-center">
              <XCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-center text-muted-foreground">
            Aponte a câmera para o código de barras do pacote
          </p>

          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <FlipHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger className="text-sm h-8">
                  <SelectValue placeholder="Câmera..." />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((cam, idx) => (
                    <SelectItem key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Câmera ${idx + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={handleClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
