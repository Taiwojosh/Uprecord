import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { resizeImage } from '../../lib/imageProcessor';
import { Spinner } from '../ui/Spinner';

interface ImageUploaderProps {
  label: string;
  value: string; // base64 string
  onChange: (base64: string) => void;
  onClear: () => void;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: string;
  description?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  value,
  onChange,
  onClear,
  maxWidth = 400,
  maxHeight = 400,
  aspectRatio = "1/1",
  description
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await resizeImage(file, maxWidth, maxHeight);
      onChange(base64);
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-gray-700 tracking-tight">{label}</label>
        {value && (
          <button 
            onClick={onClear}
            className="text-[0.625rem] font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors"
          >
            Clear Image
          </button>
        )}
      </div>

      {value ? (
        <div className="relative group overflow-hidden rounded-2xl border-2 border-gray-100 bg-gray-50/50">
          <div 
            className="w-full flex items-center justify-center p-6"
            style={{ aspectRatio }}
          >
            <img 
              src={value} 
              alt={label} 
              className="max-w-full max-h-full object-contain drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
            <button 
              onClick={handleClick}
              className="px-4 py-2 bg-white text-gray-900 text-xs font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              Change Image
            </button>
          </div>

          <div className="absolute top-3 right-3 p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <button 
          onClick={handleClick}
          disabled={isProcessing}
          className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all group relative overflow-hidden"
          style={{ aspectRatio }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="md" />
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">Processing...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-all mb-4">
                <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-blue-600" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Upload {label}</p>
              <p className="text-xs text-gray-400 font-medium max-w-[180px] text-center">
                {description || "Click to browse or drag and drop image here"}
              </p>
            </>
          )}
        </button>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
