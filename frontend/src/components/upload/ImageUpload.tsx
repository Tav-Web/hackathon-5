"use client";

import { useCallback } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAnalysis } from "@/context/AnalysisContext";
import {
  UploadContainer,
  UploadTitle,
  DropZone,
  DropZoneIcon,
  DropZoneText,
  ImageSlotsGrid,
  ImageSlot,
  SlotLabel,
  ImagePreview,
  ImagePreviewIcon,
  ImageFilename,
  RemoveButton,
  UploadLabel,
  UploadSlotButton,
  UploadSlotIcon,
  UploadSlotText,
  HiddenInput,
  UploadingText,
} from "./styles";

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
    <UploadContainer>
      <UploadTitle>Upload de Imagens</UploadTitle>

      {/* Drop Zone */}
      <DropZone
        onDragOver={(e: React.DragEvent) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <DropZoneIcon>
          <Upload className="h-8 w-8" />
        </DropZoneIcon>
        <DropZoneText>Arraste imagens aqui ou use os botões abaixo</DropZoneText>
      </DropZone>

      {/* Image Slots */}
      <ImageSlotsGrid>
        {/* Before */}
        <ImageSlot>
          <SlotLabel>Antes</SlotLabel>
          {beforeImage ? (
            <ImagePreview>
              <ImagePreviewIcon $color="#22c55e">
                <ImageIcon className="h-6 w-6" />
              </ImagePreviewIcon>
              <ImageFilename>{beforeImage.filename}</ImageFilename>
              <RemoveButton onClick={() => removeImage("before")}>
                <X className="h-4 w-4" />
              </RemoveButton>
            </ImagePreview>
          ) : (
            <UploadLabel>
              <UploadSlotButton>
                <UploadSlotIcon>
                  <Upload className="h-6 w-6" />
                </UploadSlotIcon>
                <UploadSlotText>Selecionar</UploadSlotText>
              </UploadSlotButton>
              <HiddenInput
                type="file"
                accept="image/*,.tif,.tiff"
                onChange={(e) => handleFileSelect(e, "before")}
                disabled={uploading}
              />
            </UploadLabel>
          )}
        </ImageSlot>

        {/* After */}
        <ImageSlot>
          <SlotLabel>Depois</SlotLabel>
          {afterImage ? (
            <ImagePreview>
              <ImagePreviewIcon $color="#3b82f6">
                <ImageIcon className="h-6 w-6" />
              </ImagePreviewIcon>
              <ImageFilename>{afterImage.filename}</ImageFilename>
              <RemoveButton onClick={() => removeImage("after")}>
                <X className="h-4 w-4" />
              </RemoveButton>
            </ImagePreview>
          ) : (
            <UploadLabel>
              <UploadSlotButton>
                <UploadSlotIcon>
                  <Upload className="h-6 w-6" />
                </UploadSlotIcon>
                <UploadSlotText>Selecionar</UploadSlotText>
              </UploadSlotButton>
              <HiddenInput
                type="file"
                accept="image/*,.tif,.tiff"
                onChange={(e) => handleFileSelect(e, "after")}
                disabled={uploading}
              />
            </UploadLabel>
          )}
        </ImageSlot>
      </ImageSlotsGrid>

      {uploading && <UploadingText>Enviando...</UploadingText>}
    </UploadContainer>
  );
}
