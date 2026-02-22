# Cloudflare R2 Image Upload Guide

## Overview
This application uses Cloudflare R2 for storing uploaded images. R2 is S3-compatible object storage with zero egress fees.

## Configuration

### Environment Variables
Add these to your `.env.local` file:

```env
R2_ENDPOINT=https://5f73cc4a6f174d4b99a3fff06f0b2ec9.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=ca81e139d3be8cc06b68ee022e6e13fd
R2_SECRET_ACCESS_KEY=ad4f0715d67b20b188dd400f62a53577243edcc29f33a8572e8c656aee5838f2
R2_BUCKET_NAME=scribematrix
R2_REGION=auto
R2_PUBLIC_URL=https://scribematrix.your-domain.com
```

**Note:** Update `R2_PUBLIC_URL` with your custom domain or R2 public bucket URL.

## Usage

### 1. Using the ImageUpload Component

```tsx
import ImageUpload from '@/components/ImageUpload';

function MyComponent() {
  const [logoUrl, setLogoUrl] = useState('');

  return (
    <div>
      <label>Organization Logo</label>
      <ImageUpload
        onUploadComplete={(url) => setLogoUrl(url)}
        currentImage={logoUrl}
        folder="organizations/logos"
        maxSize={5}
      />
    </div>
  );
}
```

### 2. Direct API Usage

#### Upload Image
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'awards/images');

const response = await fetch('/api/upload/image', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log('Uploaded URL:', data.url);
```

#### Delete Image
```typescript
const response = await fetch('/api/upload/delete', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: imageUrl }),
});
```

### 3. Using the Upload Service Directly

```typescript
import { uploadToR2, deleteFromR2, generateFileKey } from '@/lib/r2-upload';

// Upload
const buffer = Buffer.from(arrayBuffer);
const key = generateFileKey('photo.jpg', 'profiles');
const url = await uploadToR2(buffer, key, 'image/jpeg');

// Delete
await deleteFromR2(key);
```

## File Constraints

- **Allowed Types:** JPG, PNG, GIF, WebP, SVG
- **Max Size:** 5MB (configurable)
- **Folders:** Organize by feature (e.g., `organizations/logos`, `awards/banners`, `profiles`)

## Folder Structure Recommendations

```
scribematrix/
├── organizations/
│   ├── logos/
│   └── banners/
├── awards/
│   ├── images/
│   └── nominees/
├── elections/
│   └── banners/
├── profiles/
│   └── avatars/
└── misc/
```

## Security Features

1. **File Type Validation:** Only images allowed
2. **Size Limits:** Prevents large file uploads
3. **Unique Keys:** Timestamp + random string prevents collisions
4. **Presigned URLs:** Temporary access for private files

## Making Bucket Public (Optional)

To serve images publicly without authentication:

1. Go to Cloudflare Dashboard → R2
2. Select your bucket (`scribematrix`)
3. Settings → Public Access
4. Enable "Allow Public Access"
5. Set up custom domain or use R2.dev subdomain
6. Update `R2_PUBLIC_URL` in `.env.local`

## Custom Domain Setup

1. In Cloudflare R2, go to your bucket settings
2. Add a custom domain (e.g., `cdn.pawavotes.com`)
3. Update DNS records as instructed
4. Update `R2_PUBLIC_URL=https://cdn.pawavotes.com`

## Integration Examples

### Organization Logo Upload
```tsx
// In organization creation/edit form
<ImageUpload
  onUploadComplete={(url) => setFormData({ ...formData, logo: url })}
  currentImage={formData.logo}
  folder="organizations/logos"
/>
```

### Award Banner Upload
```tsx
// In award creation form
<ImageUpload
  onUploadComplete={(url) => setAwardData({ ...awardData, banner: url })}
  currentImage={awardData.banner}
  folder="awards/banners"
  maxSize={10}
/>
```

### Nominee Photo Upload
```tsx
// In nominee form
<ImageUpload
  onUploadComplete={(url) => setNominee({ ...nominee, photo: url })}
  currentImage={nominee.photo}
  folder="awards/nominees"
/>
```

## Troubleshooting

### Upload Fails
- Check R2 credentials in `.env.local`
- Verify bucket name is correct
- Ensure R2 API tokens have write permissions

### Images Not Loading
- Check `R2_PUBLIC_URL` is correct
- Verify bucket has public access enabled
- Check CORS settings in R2 bucket

### CORS Configuration
If accessing from browser, add CORS rules in R2:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Cost Optimization

- R2 has **zero egress fees** (unlike S3)
- Storage: ~$0.015/GB/month
- Class A operations (writes): $4.50/million
- Class B operations (reads): $0.36/million

## Next Steps

1. Update `R2_PUBLIC_URL` with your custom domain
2. Enable public access on the bucket
3. Integrate ImageUpload component in your forms
4. Test upload/delete functionality
5. Monitor usage in Cloudflare dashboard
