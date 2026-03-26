# Evida Life — Frontend Architecture

## Image Upload Standards — Two Components, No Exceptions

All image uploads in admin panels MUST use one of the two shared components below.
**NEVER write bespoke upload/crop/compress/delete logic inside an admin panel.**

---

### Standard 1: `CoverImageUploader` (single image)

**Location:** `src/components/shared/CoverImageUploader.tsx`

**Use for:** Covers, thumbnails, featured images — any field holding ONE image URL.

**Key props:**
```tsx
<CoverImageUploader
  currentUrl={coverImageUrl}        // string | null — current value
  bucket="recipe-images"            // Supabase Storage bucket name
  aspect={16 / 9}                   // crop aspect ratio
  outputWidth={1200}                // output image width in px
  outputHeight={675}                // output image height in px
  label="Cover Image"               // section label (optional)
  hint="16:9 · max 5 MB"            // hint text (optional)
  onUrlChange={setCoverImageUrl}    // called with new URL (or null on remove)
/>
```

**Bucket / crop settings by manager:**

| Manager | bucket | aspect | outputWidth × outputHeight | DB field |
|---------|--------|--------|---------------------------|----------|
| Labs | `lab-covers` | 16/9 | 1200 × 675 | `cover_image_url` |
| Courses | `course-images` | 16/9 | 1200 × 675 | `image_url` |
| Articles | `article-images` | 16/9 | 1200 × 675 | `featured_image_url` |
| Products | `product-images` | 1/1 | 800 × 800 | `image_url` |
| Recipes (cover) | `recipe-images` | 16/9 | 1200 × 675 | `image_url` |
| Recipes (thumb) | `recipe-images` | 4/3 | 600 × 450 | `thumbnail_url` |

**Behaviour:**
- Upload happens **immediately on crop confirm** (not deferred to Save)
- Deletes the old file from storage before uploading a replacement
- "Remove" button deletes the file from storage immediately
- In `handleSave`: just write `coverImageUrl` to DB — no upload step needed

---

### Standard 2: `GalleryUploader` (multi-image)

**Location:** `src/components/shared/GalleryUploader.tsx`

**Use for:** Photo slideshows, image galleries — any field holding MULTIPLE image URLs.

**Key props:**
```tsx
<GalleryUploader
  urls={galleryUrls}                // string[] — current ordered URLs
  bucket="recipe-images"            // Supabase Storage bucket name
  maxImages={10}                    // max number of images (default 10)
  outputWidth={1200}                // max width after compress (default 1200)
  label=""                          // section label (pass "" to hide)
  hint="Up to 10 images."           // hint text (optional)
  onUrlsChange={setGalleryUrls}     // called with updated string[]
/>
```

**Bucket settings by manager:**

| Manager | bucket | outputWidth | DB field | DB type |
|---------|--------|-------------|----------|---------|
| Recipes | `recipe-images` | 1200 | `image_gallery` | `jsonb` (`{url,order}[]`) |
| Products | `product-images` | 1200 | `gallery_urls` | `text[]` |
| Articles | `article-images` | 1200 | `gallery_urls` | `text[]` |
| Courses | `course-images` | 1200 | `gallery_urls` | `text[]` |

**Behaviour:**
- Each image is **uploaded immediately** when added (compress → upload → `onUrlsChange`)
- Deleted from storage immediately when removed
- Ordering via move-left/move-right buttons on hover
- Pending uploads shown with spinner overlay
- In `handleSave`: just write `galleryUrls` to DB — no upload step needed

**Note for Recipes:** `image_gallery` is `jsonb` with `{url: string, order: number}[]` (legacy schema).
Convert in save: `galleryUrls.map((url, i) => ({ url, order: i }))`.
Convert on load: `(raw ?? []).sort((a,b) => a.order - b.order).map(g => g.url)`.

---

## Admin Panel Pattern — handleSave

With the shared uploaders, `handleSave` is simple — no upload logic, just DB writes:

```tsx
const handleSave = async () => {
  setSaving(true);
  try {
    const payload = {
      ...formFields,
      image_url: coverImageUrl,          // already uploaded
      gallery_urls: galleryUrls,         // already uploaded
    };
    await supabase.from('table').upsert(payload);
    onSaved();
  } catch (e) {
    setError(String(e));
  } finally {
    setSaving(false);
  }
};
```

---

## Database Columns

### gallery_urls columns (text[])
- `articles.gallery_urls` — added 2026-03-26
- `courses.gallery_urls` — added 2026-03-26
- `products.gallery_urls` — existing
- `recipes.image_gallery` — existing (jsonb, see note above)

### cover image columns
- `recipes.thumbnail_url` — added 2026-03-26

---

## Storage Buckets

| Bucket | Used by | Public |
|--------|---------|--------|
| `lab-covers` | Labs admin | Yes |
| `recipe-images` | Recipes admin (cover + thumb + gallery) | Yes |
| `product-images` | Products admin (cover + gallery) | Yes |
| `article-images` | Articles admin (cover + gallery) | Yes |
| `course-images` | Courses admin (cover + gallery) | Yes |

All buckets must be set to **public** in Supabase Storage for `getPublicUrl()` to work.

---

## Upload API

**Endpoint:** `POST /api/upload-image`

**Request body:**
```json
{
  "base64": "...",         // raw base64 WITHOUT the data:...;base64, prefix
  "filename": "cover.jpg",
  "bucket": "recipe-images",
  "contentType": "image/jpeg"
}
```

**Response:** `{ "url": "https://..." }` — the public storage URL.

**Critical:** Always strip the data URL prefix before sending:
```ts
const base64 = (dataUrl).split(',')[1];  // ← required, never send the full data URL
```
