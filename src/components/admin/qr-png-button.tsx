"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Scarica il QR come PNG: l'SVG (generato dal server) viene disegnato su un canvas bianco e salvato. */
export function QrPngButton({ svg, filename, label, error }: { svg: string; filename: string; label: string; error: string }) {
  const [failed, setFailed] = useState(false);

  async function download() {
    setFailed(false);
    const size = 1024;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      image.decoding = "async";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("immagine"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, size, size);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("png");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch {
      setFailed(true);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={download} data-testid="qr-png" className="min-h-9">
        {label}
      </Button>
      {failed ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
