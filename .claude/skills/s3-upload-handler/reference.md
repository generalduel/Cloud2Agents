# S3 Upload Reference

## Files
- **S3 client**: `src/lib/s3/client.ts` — `getS3Client()` (lazy; requires `AWS_REGION` at runtime)
- **UI Component**: `src/components/ui/s3-uploader/s3-uploader.tsx`
- **Client SDK**: `src/lib/s3/clientS3Uploader.ts`
- **Server Utility**: `src/lib/s3/uploadFromServer.ts`
- **Presigned helpers**: `src/lib/s3/createS3UploadFields.ts`, `src/lib/s3/getPresignedUrl.ts`

## Components

### S3Uploader Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presignedRouteProvider` | `string` | Required | API endpoint to get presigned URL |
| `variant` | `"button" \| "dropzone"` | Required | UI style |
| `onUpload` | `(urls: string[]) => Promise<void>` | Required | Success callback |
| `maxFiles` | `number` | `1` | Max files allowed |
| `maxSize` | `number` | `5MB` | Max file size in bytes |
| `accept` | `string` | `undefined` | File type filter (e.g. "image/*") |
| `multiple` | `boolean` | `false` | Allow multiple files |
| `value` | `string \| string[]` | `undefined` | Controlled value |
| `onChange` | `(val: string \| string[]) => void` | `undefined` | Controlled change handler |

## Examples

### Button Variant (Single File)
```tsx
<S3Uploader
  variant="button"
  presignedRouteProvider="/api/upload"
  onUpload={handleUpload}
  buttonText="Upload Avatar"
/>
```

### Dropzone Variant (Multiple Files)
```tsx
<S3Uploader
  variant="dropzone"
  presignedRouteProvider="/api/upload"
  onUpload={handleUpload}
  multiple
  maxFiles={5}
  dropzoneText="Drag project files here"
/>
```

