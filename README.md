# FileVault

A file storage app powered by **Embr Blob Storage** — no database required.

Upload, browse, search, preview, and delete files using Embr''s built-in blob storage.

## Features

- **File upload** with drag-and-drop (multi-file)
- **File browser** with search, type icons, and size info
- **Image preview** in lightbox
- **Direct download** links for all files
- **No database** — files are listed directly from blob storage

## Embr Primitives Used

| Primitive | Purpose |
|-----------|---------|
| **Storage** | All file operations (upload, list, download, delete) |

## How It Works

The Embr proxy intercepts requests to `/_embr/blob/*` and routes them to Azure Blob Storage.
The Express server proxies authenticated operations (upload, list, delete) through the proxy,
while the browser fetches files directly via public GET.

## Local Development

```bash
npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `EMBR_BLOB_KEY` | API key for blob storage writes |
