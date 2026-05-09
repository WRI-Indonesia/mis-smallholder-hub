# S3 Scripts

Kumpulan script untuk mengelola file S3 di IDCloudHost.

## Setup Environment Variables

Pastikan environment variables berikut sudah diset:

```bash
S3_KEY=your_access_key_id
S3_SECRET=your_secret_access_key
S3_BUCKET=mis-dev
```

## get-link.js

Script untuk generate presigned URL dari file yang ada di S3 bucket.

### Usage

```bash
# Via npm script
npm run s3:get-link "path/to/file.pdf"

# Direct node
node scripts/get-link.js "path/to/file.pdf"
```

### Examples

```bash
# Training evidence PDF
npm run s3:get-link "training/evidence/2026/05/training-report.pdf"

# Staff activity photo
npm run s3:get-link "staff-activity/2026/05/09/photo-123.jpg"

# Farmer profile image
npm run s3:get-link "farmers/profile/farmer-001.jpg"
```

### Features

- Generate presigned URL valid for 1 hour (3600 seconds)
- Support untuk semua file types (PDF, JPG, PNG, etc.)
- Error handling untuk file tidak ditemukan
- Validation untuk environment variables

### S3 Configuration

- **Endpoint**: `https://is3.cloudhost.id`
- **Region**: `id-jkt-1`
- **Bucket**: `mis-dev` (default)
- **Force Path Style**: `true`

### Output

Script akan menampilkan:
- Presigned URL yang bisa diakses langsung
- Informasi expiry time (60 menit)
- Error message jika ada masalah

### Integration dengan Training Module

Script ini dapat diintegrasikan dengan existing training evidence system untuk:
- Generate link PDF evidence yang sudah diupload
- Akses file training documentation
- Download training materials
- Backup dan recovery file training