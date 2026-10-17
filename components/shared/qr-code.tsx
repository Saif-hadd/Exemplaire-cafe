"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
export function QrCodeImage({
  value,
  size = 240,
  className = "",
  foreground = "#171717",
  background = "#ffffff",
}: {
  value: string;
  size?: number;
  className?: string;
  foreground?: string;
  background?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 3,
      errorCorrectionLevel: "M",
      color: { dark: foreground, light: background },
    }).then((x) => {
      if (active) setUrl(x);
    });
    return () => {
      active = false;
    };
  }, [value, size, foreground, background]);
  return url ? (
    <img
      className={className}
      src={url}
      width={size}
      height={size}
      alt="Scannable QR code"
    />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="animate-pulse bg-secondary"
      aria-label="Generating QR code"
    />
  );
}
