import "server-only";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client } from "./client";

const uploadFromServer = async ({
  file,
  path,
  contentType,
}: {
  file: string;
  path: string;
  contentType?: string;
}) => {
  // normalize path for web by remove all spaces and special characters don't remove the dot and slash
  const normalizedPath = path.replace(/[^a-zA-Z0-9.\/]/g, "");

  // convert base64 string to buffer
  const buffer = Buffer.from(file, "base64");
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: normalizedPath,
    Body: buffer,
    ContentType: contentType || undefined,
  };
  const data = await getS3Client().send(new PutObjectCommand(params));

  if (!data) throw new Error("File not uploaded");

  const location =
    `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/` +
    normalizedPath;
  return location;
};

export default uploadFromServer;
