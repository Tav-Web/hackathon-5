"use client";

import { useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";

export function ImageUpload() {
  const { images, status, uploadImageFile, removeImage } = useAnalysis();
  const uploading = status === "uploading";

  const handleUpload = useCallback(
    async (file: File, type: "before" | "after") => {
      try {
        await uploadImageFile(file, type);
        toast.success(`Imagem "${type === "before" ? "Antes" : "Depois"}" enviada com sucesso`);
      } catch {
        toast.error("Erro ao enviar imagem");
      }
    },
    [uploadImageFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const type = images.some((img) => img.type === "before") ? "after" : "before";
        handleUpload(files[0], type);
      }
    },
    [images, handleUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "before" | "after") => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file, type);
    }
  };

  const beforeImage = images.find((img) => img.type === "before");
  const afterImage = images.find((img) => img.type === "after");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Upload de Imagens</h2>

      {/* Drop Zone */}
      <div
        className="border-2 border-dashed rounded-lg p-4 text-center transition-colors border-gray-700 hover:border-gray-600"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-400">Arraste imagens aqui ou use os botões abaixo</p>
      </div>

      {/* Image Slots */}
      <div className="grid grid-cols-2 gap-3">
        {/* Before */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Antes</label>
          {beforeImage ? (
            <div className="relative bg-gray-800 rounded-lg p-3">
              <ImageIcon className="h-6 w-6 text-green-500 mb-1" />
              <p className="text-xs text-gray-400 truncate">{beforeImage.filename}</p>
              <button
                onClick={() => removeImage("before")}
                className="absolute top-1 right-1 p-1 hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="bg-gray-800 rounded-lg p-3 text-center hover:bg-gray-750 transition-colors">
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <span className="text-xs text-gray-400">Selecionar</span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.tif,.tiff"
                onChange={(e) => handleFileSelect(e, "before")}
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {/* After */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Depois</label>
          {afterImage ? (
            <div className="relative bg-gray-800 rounded-lg p-3">
              <ImageIcon className="h-6 w-6 text-blue-500 mb-1" />
              <p className="text-xs text-gray-400 truncate">{afterImage.filename}</p>
              <button
                onClick={() => removeImage("after")}
                className="absolute top-1 right-1 p-1 hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="bg-gray-800 rounded-lg p-3 text-center hover:bg-gray-750 transition-colors">
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <span className="text-xs text-gray-400">Selecionar</span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.tif,.tiff"
                onChange={(e) => handleFileSelect(e, "after")}
                disabled={uploading}
              />
            </label>
          )}
        </div>
      </div>

      {uploading && <p className="text-sm text-blue-400 text-center">Enviando...</p>}
    </div>
  );
}
