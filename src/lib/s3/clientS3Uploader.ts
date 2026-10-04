export interface ClientS3UploaderOptions {
  presignedRouteProvider: string;
}

export interface UploadFileOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: any;
}

export class ClientS3Uploader {
  private presignedRouteProvider: string;

  constructor(options: ClientS3UploaderOptions) {
    this.presignedRouteProvider = options.presignedRouteProvider;
  }

  /**
   * Uploads a file to S3 using presigned URL
   * @param file - The file to upload
   * @param options - Additional options including meta data
   * @returns Promise<string> - The URL of the uploaded file
   */
  async uploadFile(file: File, options: UploadFileOptions = {}): Promise<string> {
    const { meta } = options;

    try {
      // Get presigned URL and fields
      const createUploadUrlResponse = await fetch(this.presignedRouteProvider, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          ...meta,
        }),
      });

      if (!createUploadUrlResponse.ok) {
        const response = await createUploadUrlResponse.json();
        throw new Error(response.error || "Failed to get upload URL");
      }

      const uploadData = await createUploadUrlResponse.json();

      if (!uploadData.url) {
        throw new Error("No upload URL received");
      }

      // Create FormData for S3 upload
      const formData = new FormData();
      const fields = uploadData.fields || {};

      // Add all fields from presigned post
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value as string);
      }

      // Add the file last
      formData.append("file", file);

      // Upload to S3
      const uploadResponse = await fetch(uploadData.url, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const responseText = await uploadResponse.text();
        throw new Error(
          `Upload failed (${uploadResponse.status}): ${responseText || uploadResponse.statusText}`
        );
      }

      if (uploadData.publicUrl) {
        return uploadData.publicUrl as string;
      }

      const key = (fields.key as string | undefined) || file.name;
      const baseUrl = (uploadData.url as string).replace(/\/$/, "");
      return `${baseUrl}/${key.replace(/^\//, "")}`;
    } catch (error) {
      console.error("S3 upload error:", error);
      throw error;
    }
  }

  /**
   * Uploads multiple files to S3 concurrently
   * @param files - Array of files to upload
   * @param options - Additional options including meta data
   * @returns Promise<string[]> - Array of URLs of the uploaded files
   */
  async uploadFiles(files: File[], options: UploadFileOptions = {}): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }
}

// Export a default instance factory for convenience
export const createS3Uploader = (presignedRouteProvider: string) => {
  return new ClientS3Uploader({ presignedRouteProvider });
};
