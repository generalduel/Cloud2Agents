import { S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("AWS_REGION is not configured");
    }
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

export default getS3Client;
