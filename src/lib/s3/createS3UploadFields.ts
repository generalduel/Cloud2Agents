import {
  createPresignedPost,
  PresignedPost,
  PresignedPostOptions,
} from "@aws-sdk/s3-presigned-post";
import { getS3Client } from "./client";

const createS3UploadFields = async ({
  path,
  maxSize,
  contentType,
}: {
  path: string;
  maxSize?: number;
  contentType?: string;
}): Promise<PresignedPost> => {
  if (!process.env.AWS_BUCKET_NAME) {
    throw new Error("AWS_BUCKET_NAME is not set");
  }

  const conditions: NonNullable<PresignedPostOptions["Conditions"]> = [];

  if (maxSize) {
    conditions.push(["content-length-range", 0, maxSize]);
  }

  if (contentType) {
    conditions.push(["starts-with", "$Content-Type", contentType]);
  }

  const params: PresignedPostOptions = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: path,
    Conditions: conditions,
    Fields: contentType
      ? {
          "Content-Type": contentType,
        }
      : {},
    Expires: 3600,
  };

  const result = await createPresignedPost(getS3Client(), params);

  return result;
};

export default createS3UploadFields;
