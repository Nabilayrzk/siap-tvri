import React, { useRef, useState, useEffect } from 'react';
import { Eraser, PenTool, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (dataUrl: string | null) => void;
  readOnly?: boolean;
  label?: string;
  required?: boolean;
  error?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  readOnly = false,
  label = 'Tanda Tangan',
  required = false,
  error = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(Boolean(value));

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution canvas based on DPR
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initial styling
    ctx.strokeStyle = '#1e3a8a'; // Dark blue ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load initial image if provided
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, [value]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing || readOnly) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
          {required && !readOnly && !hasSignature && (
            <span className="text-rose-500 font-bold text-xs" title="Wajib Diisi"></span>
          )}
        </label>
        {!readOnly && hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline transition-all"
          >
            <Eraser className="w-3 h-3" />
            <span>Bersihkan</span>
          </button>
        )}
      </div>

      <div
        className={`relative border rounded-xl overflow-hidden bg-white transition-all ${
          readOnly
            ? 'border-slate-200 bg-slate-50'
            : error && !hasSignature
            ? 'border-rose-500 ring-2 ring-rose-500/20'
            : hasSignature
            ? 'border-blue-300 ring-2 ring-blue-500/10'
            : 'border-slate-300 border-dashed hover:border-blue-400'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-28 touch-none block ${readOnly ? 'cursor-default' : 'cursor-crosshair'}`}
        />

        {!hasSignature && !readOnly && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 space-y-1">
            <PenTool className="w-5 h-5 text-slate-300 animate-bounce" />
            <span className="text-[11px]">Goreskan tanda tangan di sini</span>
          </div>
        )}

        {!hasSignature && readOnly && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400">
            <span className="text-[11px] italic">Belum ada tanda tangan</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;
