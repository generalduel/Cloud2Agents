"use client";

import React, { useCallback, useState, useMemo } from "react";
import { toast } from "sonner";
import { Upload, X, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientS3Uploader } from "@/lib/s3/clientS3Uploader";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";

export interface S3UploaderProps {
  presignedRouteProvider: string;
  variant: "button" | "dropzone";
  onUpload: (fileUrls: string[]) => Promise<void>;
  currentFileUrl?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any; 
  className?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  onFileValidate?: (file: File) => string | null | undefined;
  onFileReject?: (file: File, message: string) => void;
  // Form integration props
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  name?: string;
  // Button variant specific props
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  // Dropzone specific props
  dropzoneText?: string;
  dropzoneSubtext?: string;
}

interface UploadState {
  isUploading: boolean;
  uploadedUrls: string[];
  error: string | null;
}

function S3Uploader({
  presignedRouteProvider,
  variant,
  onUpload,
  meta,
  className,
  accept,
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB default
  multiple = false,
  disabled = false,
  onFileValidate,
  onFileReject,
  onChange,
  name,
  buttonText = "Upload File",
  buttonVariant = "outline",
  buttonSize = "default",
  dropzoneText = "Drag & drop files here",
  dropzoneSubtext,
}: S3UploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadedUrls: [],
    error: null,
  });

  const uploader = useMemo(
    () => new ClientS3Uploader({ presignedRouteProvider }),
    [presignedRouteProvider]
  );

  const uploadFileToS3 = useCallback(
    async (file: File): Promise<string> => {
      return uploader.uploadFile(file, { meta });
    },
    [uploader, meta]
  );

  const handleFilesUpload = useCallback(
    async (
      uploadFiles: File[],
      {
        onSuccess,
        onError,
      }: {
        onProgress: (file: File, progress: number) => void;
        onSuccess: (file: File) => void;
        onError: (file: File, error: Error) => void;
      }
    ) => {
      setUploadState({
        isUploading: true,
        uploadedUrls: [],
        error: null,
      });

      try {
        const uploadedUrls: string[] = [];

        for (const file of uploadFiles) {
          try {
            const url = await uploadFileToS3(file);
            uploadedUrls.push(url);
            onSuccess(file);
          } catch (error) {
            const uploadError =
              error instanceof Error ? error : new Error("Upload failed");
            onError(file, uploadError);
            throw uploadError;
          }
        }

        setUploadState({
          isUploading: false,
          uploadedUrls,
          error: null,
        });

        await onUpload(uploadedUrls);

        if (onChange) {
          const newValue = multiple ? uploadedUrls : uploadedUrls[0] || "";
          onChange(newValue);
        }

        setFiles([]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setUploadState({
          isUploading: false,
          uploadedUrls: [],
          error: errorMessage,
        });
        toast.error(`Upload failed: ${errorMessage}`);
      }
    },
    [uploadFileToS3, onUpload, onChange, multiple]
  );

  const handleFileReject = useCallback(
    (file: File, message: string) => {
      onFileReject?.(file, message);
      toast.error(message, {
        description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" was rejected`,
      });
    },
    [onFileReject]
  );

  const defaultSubtext =
    dropzoneSubtext ||
    `Or click to browse (max ${maxFiles} file${maxFiles > 1 ? "s" : ""}, up to ${Math.round(maxSize / (1024 * 1024))}MB each)`;

  if (variant === "button") {
    return (
      <div className={cn("relative", className)}>
        <FileUpload
          maxFiles={maxFiles}
          maxSize={maxSize}
          accept={accept}
          value={files}
          onValueChange={setFiles}
          onFileReject={handleFileReject}
          onFileValidate={onFileValidate}
          multiple={multiple}
          disabled={disabled || uploadState.isUploading}
          name={name}
          onUpload={handleFilesUpload}
        >
          <FileUploadTrigger asChild>
            <Button
              variant={buttonVariant}
              size={buttonSize}
              disabled={disabled || uploadState.isUploading}
              className="relative"
            >
              {uploadState.isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : uploadState.error ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Upload Failed
                </>
              ) : uploadState.uploadedUrls.length > 0 ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Uploaded
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {buttonText}
                </>
              )}
            </Button>
          </FileUploadTrigger>

          <FileUploadList>
            {files.map((file, index) => (
              <FileUploadItem key={index} value={file}>
                <FileUploadItemPreview />
                <FileUploadItemMetadata />
                <FileUploadItemProgress />
                <FileUploadItemDelete asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                </FileUploadItemDelete>
              </FileUploadItem>
            ))}
          </FileUploadList>
        </FileUpload>

        {uploadState.error && (
          <p className="mt-2 text-sm text-destructive">{uploadState.error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <FileUpload
        maxFiles={maxFiles}
        maxSize={maxSize}
        accept={accept}
        value={files}
        onValueChange={setFiles}
        onFileReject={handleFileReject}
        onFileValidate={onFileValidate}
        multiple={multiple}
        disabled={disabled || uploadState.isUploading}
        name={name}
        onUpload={handleFilesUpload}
      >
        <FileUploadDropzone>
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center justify-center rounded-full border p-2.5">
              {uploadState.isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : uploadState.error ? (
                <AlertCircle className="h-6 w-6 text-destructive" />
              ) : uploadState.uploadedUrls.length > 0 ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="font-medium text-sm">
              {uploadState.isUploading
                ? "Uploading..."
                : uploadState.error
                  ? "Upload failed"
                  : uploadState.uploadedUrls.length > 0
                    ? "Upload complete"
                    : dropzoneText}
            </p>
            <p className="text-muted-foreground text-xs">{defaultSubtext}</p>
          </div>
          <FileUploadTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-fit"
              disabled={disabled || uploadState.isUploading}
            >
              Browse files
            </Button>
          </FileUploadTrigger>
        </FileUploadDropzone>

        <FileUploadList>
          {files.map((file, index) => (
            <FileUploadItem key={index} value={file}>
              <FileUploadItemPreview />
              <FileUploadItemMetadata />
              <FileUploadItemProgress />
              <FileUploadItemDelete asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </FileUploadItemDelete>
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>

      {uploadState.error && (
        <p className="mt-2 text-sm text-destructive">{uploadState.error}</p>
      )}
    </div>
  );
}

export default S3Uploader;
