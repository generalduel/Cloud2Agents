export function getPublicS3Url(path: string): string {
  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  if (!bucket || !region) {
    throw new Error("AWS_BUCKET_NAME or AWS_REGION is not set");
  }

  const normalizedPath = path.replace(/^\/+/, "");
  return `https://${bucket}.s3.${region}.amazonaws.com/${normalizedPath}`;
}
