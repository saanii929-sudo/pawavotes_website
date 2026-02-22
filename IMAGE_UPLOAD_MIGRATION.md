# Image Upload Migration to Cloudflare R2

## Pages with Image Uploads

### 1. Election Candidates (`app/election-dashboard/candidates/page.tsx`)
- **Current:** Base64 encoding stored in MongoDB
- **Field:** `image`
- **Folder:** `elections/candidates`
- **Usage:** Candidate profile photos

### 2. Awards (`app/dashboard/awards/page.tsx`)
- **Current:** Base64 encoding stored in MongoDB
- **Field:** `eventImage` (banner)
- **Folder:** `awards/banners`
- **Usage:** Award event banners

### 3. Nominees (`app/dashboard/awards/nominees/page.tsx`)
- **Current:** Base64 encoding stored in MongoDB
- **Field:** `image`
- **Folder:** `awards/nominees`
- **Usage:** Nominee profile photos

### 4. Organization Settings (`app/dashboard/organisation/page.tsx`)
- **Current:** Base64 encoding stored in MongoDB
- **Field:** `logo`
- **Folder:** `organizations/logos`
- **Usage:** Organization logos

## Migration Benefits

### Before (Base64)
- ❌ Large database size
- ❌ Slow queries
- ❌ Poor performance
- ❌ 16MB MongoDB document limit
- ❌ Expensive database storage

### After (Cloudflare R2)
- ✅ Small database (only URLs)
- ✅ Fast queries
- ✅ Better performance
- ✅ No size limits
- ✅ Cheap storage ($0.015/GB/month)
- ✅ Zero egress fees
- ✅ CDN-ready

## Implementation Plan

1. ✅ Install AWS SDK for S3
2. ✅ Create R2 upload service
3. ✅ Create upload API endpoints
4. ✅ Create ImageUpload component
5. 🔄 Update all 4 pages to use R2
6. 🔄 Test uploads on each page
7. 🔄 Update database schemas if needed

## Next Steps

Replace the base64 FileReader logic with the ImageUpload component on each page.
