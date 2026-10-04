import withAuthRequired from "@/lib/auth/withAuthRequired";
import createS3UploadFields from "@/lib/s3/createS3UploadFields";
import { NextResponse } from "next/server";

interface UploadImageRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const { fileName, fileType, fileSize }: UploadImageRequest =
      await req.json();

    // Basic validation
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields: fileName, fileType, fileSize" },
        { status: 400 }
      );
    }

    // Validate file type (only allow images)
    if (!fileType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Extract file extension
    const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";

    // Generate UUID for filename
    const fileUuid = crypto.randomUUID();

    // Construct S3 path: /public/users/<user-id>/images/<filename-uuid>.format
    const s3Path = `public/users/${session.user.id}/images/${fileUuid}.${fileExtension}`;

    // Create presigned URL
    const presignedPost = await createS3UploadFields({
      path: s3Path,
      maxSize: fileSize,
      contentType: fileType,
    });

    return NextResponse.json({
      url: presignedPost.url,
      fields: presignedPost.fields,
    });
  } catch (error) {
    console.error("Error creating presigned URL for image upload:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
});

