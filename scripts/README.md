# S3 Scripts

Kumpulan script untuk mengelola file S3 di IDCloudHost.

## Setup Environment Variables

Pastikan environment variables berikut sudah diset:

```bash
S3_ACCESS_KEY_ID=your_access_key_id
S3_SECRET_ACCESS_KEY=your_secret_access_key
S3_BUCKET_NAME=mis-dev
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
npm run s3:get-link "training/evidence/2026/05/activity-123/training-report.pdf"

# Staff activity photo
npm run s3:get-link "staff-activity/2026/05/09/photo-123.jpg"

# Farmer profile image
npm run s3:get-link "farmers/profile/farmer-001.jpg"
```

## pdf-manager.js

Advanced PDF management tool untuk training evidence dengan fitur lengkap.

### Usage

```bash
# Via npm scripts
npm run pdf:manage <command> [options]
npm run pdf:list
npm run pdf:cleanup

# Direct node
node scripts/pdf-manager.js <command> [options]
```

### Commands

#### Generate Link
```bash
# Generate presigned URL (default: 1 hour)
npm run pdf:manage link "training/evidence/2026/05/activity-123/report.pdf"

# Generate link with custom expiry (24 hours)
npm run pdf:manage link "training/evidence/2026/05/activity-123/report.pdf" 24
```

#### List Files
```bash
# List all training PDF files
npm run pdf:list

# List files for specific activity
npm run pdf:manage list activity-123
```

#### Download Link
```bash
# Generate download link
npm run pdf:manage download "training/evidence/2026/05/activity-123/report.pdf"

# Generate download link with custom filename
npm run pdf:manage download "training/evidence/2026/05/activity-123/report.pdf" "Training Report May 2026.pdf"
```

#### Delete File
```bash
# Show delete preview (safe)
npm run pdf:manage delete "training/evidence/2026/05/activity-123/old-report.pdf"

# Actually delete file (requires --confirm)
npm run pdf:manage delete "training/evidence/2026/05/activity-123/old-report.pdf" --confirm
```

#### Cleanup
```bash
# Clean up orphaned files (files without database records)
npm run pdf:cleanup
```

### Features

- **Smart File Organization**: Files organized by year/month/activity structure
- **Metadata Tracking**: Enhanced S3 metadata for better file management
- **Link Management**: Generate presigned URLs with custom expiry times
- **Download Links**: Generate download links with custom filenames
- **File Listing**: List files with size, date, and activity information
- **Safe Deletion**: Preview before delete, requires confirmation
- **Cleanup Tools**: Identify and remove orphaned files
- **Error Handling**: Comprehensive error handling and user feedback

### S3 Configuration

- **Endpoint**: `https://is3.cloudhost.id`
- **Region**: `id-jkt-1`
- **Bucket**: `mis-dev` (default)
- **Force Path Style**: `true`

### File Structure

Training evidence files are organized as:
```
training/evidence/YYYY/MM/activity-id/timestamp-filename.pdf
```

Example:
```
training/evidence/2026/05/activity-123/1714567890-training-report.pdf
```

### Integration dengan Training Module

Scripts ini terintegrasi dengan training evidence system untuk:
- Generate link PDF evidence yang sudah diupload
- Akses file training documentation
- Download training materials dengan nama custom
- Backup dan recovery file training
- Cleanup file orphaned untuk maintenance
- Monitoring usage dan storage statistics

### Output Examples

#### Link Generation
```
✅ Presigned URL generated successfully:
📁 File: training/evidence/2026/05/activity-123/report.pdf
🔗 URL: https://is3.cloudhost.id/mis-dev/training/evidence/...
⏰ Expires: 5/10/2026, 10:30:00 AM
⏱️  Valid for: 24 hour(s)
```

#### File Listing
```
📋 Training PDF Files (15 found):
================================================================================
1. training/evidence/2026/05/activity-123/1714567890-report.pdf
   📅 Modified: 5/9/2026, 9:15:00 AM
   📏 Size: 2.5 MB
   🎯 Activity: activity-123
   📆 Date: 2026-05

📊 Total: 15 files, 45.2 MB
```