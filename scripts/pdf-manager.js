require("dotenv/config");
const { S3Client, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 Client for IDCloudHost
const client = new S3Client({
    endpoint: "https://is3.cloudhost.id",
    region: "id-jkt-1", 
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    },
    forcePathStyle: true 
});

const bucketName = process.env.S3_BUCKET_NAME || "mis-dev";

// ─── Helper Functions ────────────────────────────────────────────────────────

function formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function parseS3Key(key) {
    const parts = key.split("/");
    if (parts[0] === "training" && parts[1] === "evidence") {
        return {
            type: "training",
            year: parts[2],
            month: parts[3],
            activityId: parts[4],
            filename: parts[5]?.split("-").slice(1).join("-")
        };
    }
    return { type: "other" };
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function generateLink(fileKey, expiresInHours = 1) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        const expiresIn = expiresInHours * 3600;
        const url = await getSignedUrl(client, command, { expiresIn });

        console.log(`\n✅ Presigned URL generated successfully:`);
        console.log(`📁 File: ${fileKey}`);
        console.log(`🔗 URL: ${url}`);
        console.log(`⏰ Expires: ${new Date(Date.now() + expiresIn * 1000).toLocaleString()}`);
        console.log(`⏱️  Valid for: ${expiresInHours} hour(s)\n`);

        return url;
    } catch (err) {
        console.error("❌ Error generating link:", err.message);
        return null;
    }
}

async function listTrainingPDFs(activityId = null) {
    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: "training/evidence/",
        });

        const response = await client.send(command);
        // activityId sits at depth 4 (training/evidence/<year>/<month>/<activityId>/…),
        // so it can't be used as an S3 prefix — filter the listing client-side instead.
        const files = (response.Contents || []).filter(
            (file) => !activityId || parseS3Key(file.Key).activityId === activityId
        );

        const heading = activityId
            ? `Training PDF Files for activity ${activityId}`
            : "Training PDF Files";
        console.log(`\n📋 ${heading} (${files.length} found):`);
        console.log("=" .repeat(80));

        let totalSize = 0;
        files.forEach((file, index) => {
            const metadata = parseS3Key(file.Key);
            const size = file.Size || 0;
            totalSize += size;

            console.log(`${index + 1}. ${file.Key}`);
            console.log(`   📅 Modified: ${file.LastModified?.toLocaleString()}`);
            console.log(`   📏 Size: ${formatFileSize(size)}`);
            if (metadata.type === "training") {
                console.log(`   🎯 Activity: ${metadata.activityId}`);
                console.log(`   📆 Date: ${metadata.year}-${metadata.month}`);
            }
            console.log("");
        });

        console.log(`📊 Total: ${files.length} files, ${formatFileSize(totalSize)}\n`);
        return files;
    } catch (err) {
        console.error("❌ Error listing files:", err.message);
        return [];
    }
}

async function downloadLink(fileKey, filename = null) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            ResponseContentDisposition: filename 
                ? `attachment; filename="${filename}"` 
                : `attachment; filename="${fileKey.split('/').pop()}"`,
        });

        const url = await getSignedUrl(client, command, { expiresIn: 3600 });

        console.log(`\n⬇️  Download link generated:`);
        console.log(`📁 File: ${fileKey}`);
        console.log(`🔗 Download URL: ${url}`);
        console.log(`⏰ Valid for: 1 hour\n`);

        return url;
    } catch (err) {
        console.error("❌ Error generating download link:", err.message);
        return null;
    }
}

async function deleteFile(fileKey, confirm = false) {
    try {
        if (!confirm) {
            console.log(`\n⚠️  This will permanently delete: ${fileKey}`);
            console.log("Add --confirm flag to proceed with deletion.\n");
            return false;
        }

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        await client.send(command);
        console.log(`\n✅ File deleted successfully: ${fileKey}\n`);
        return true;
    } catch (err) {
        console.error("❌ Error deleting file:", err.message);
        return false;
    }
}

// ─── Main CLI Handler ────────────────────────────────────────────────────────

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Allow help command without environment variables
    if (command === "help" || !command) {
        console.log("\n📚 Training PDF Manager - CLI Tool");
        console.log("=" .repeat(50));
        console.log("\nAvailable commands:");
        console.log("  link <file-path> [hours]     Generate presigned URL (default: 1 hour)");
        console.log("  list [activity-id]           List all training PDF files");
        console.log("  download <file-path> [name]  Generate download link");
        console.log("  delete <file-path> --confirm Delete file from S3");
        console.log("  help                         Show this help message");
        console.log("\nExamples:");
        console.log('  node pdf-manager.js link "training/evidence/2026/05/activity-123/report.pdf" 24');
        console.log("  node pdf-manager.js list");
        console.log('  node pdf-manager.js download "training/evidence/2026/05/activity-123/report.pdf"');
        console.log('  node pdf-manager.js delete "training/evidence/2026/05/activity-123/old-file.pdf" --confirm');
        console.log("\nEnvironment variables required:");
        console.log("  S3_ACCESS_KEY_ID     - S3 Access Key ID");
        console.log("  S3_SECRET_ACCESS_KEY - S3 Secret Access Key");
        console.log("  S3_BUCKET_NAME       - S3 Bucket name (default: mis-dev)\n");
        return;
    }

    if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
        console.log("❌ Error: S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY environment variables are not set.");
        process.exit(1);
    }

    switch (command) {
        case "link":
        case "get-link": {
            const fileKey = args[1];
            const hours = parseInt(args[2]) || 1;
            
            if (!fileKey) {
                console.log("\n❌ Error: No file path provided.");
                console.log("Usage: node pdf-manager.js link <file-path> [hours]");
                console.log('Example: node pdf-manager.js link "training/evidence/2026/05/activity-123/file.pdf" 24\n');
                process.exit(1);
            }
            
            await generateLink(fileKey, hours);
            break;
        }

        case "list": {
            const activityId = args[1];
            await listTrainingPDFs(activityId);
            break;
        }

        case "download": {
            const fileKey = args[1];
            const filename = args[2];
            
            if (!fileKey) {
                console.log("\n❌ Error: No file path provided.");
                console.log("Usage: node pdf-manager.js download <file-path> [filename]");
                console.log('Example: node pdf-manager.js download "training/evidence/2026/05/activity-123/file.pdf" "report.pdf"\n');
                process.exit(1);
            }
            
            await downloadLink(fileKey, filename);
            break;
        }

        case "delete": {
            const fileKey = args[1];
            const confirm = args.includes("--confirm");

            if (!fileKey) {
                console.log("\n❌ Error: No file path provided.");
                console.log("Usage: node pdf-manager.js delete <file-path> [--confirm]");
                console.log('Example: node pdf-manager.js delete "training/evidence/2026/05/activity-123/file.pdf" --confirm\n');
                process.exit(1);
            }

            await deleteFile(fileKey, confirm);
            break;
        }

        case "help":
        default: {
            console.log("\n📚 Training PDF Manager - CLI Tool");
            console.log("=" .repeat(50));
            console.log("\nAvailable commands:");
            console.log("  link <file-path> [hours]     Generate presigned URL (default: 1 hour)");
            console.log("  list [activity-id]           List all training PDF files");
            console.log("  download <file-path> [name]  Generate download link");
            console.log("  delete <file-path> --confirm Delete file from S3");
            console.log("  cleanup                      Clean up orphaned files");
            console.log("  help                         Show this help message");
            console.log("\nExamples:");
            console.log('  node pdf-manager.js link "training/evidence/2026/05/activity-123/report.pdf" 24');
            console.log("  node pdf-manager.js list");
            console.log('  node pdf-manager.js download "training/evidence/2026/05/activity-123/report.pdf"');
            console.log('  node pdf-manager.js delete "training/evidence/2026/05/activity-123/old-file.pdf" --confirm');
            console.log("\nEnvironment variables required:");
            console.log("  S3_ACCESS_KEY_ID     - S3 Access Key ID");
            console.log("  S3_SECRET_ACCESS_KEY - S3 Secret Access Key");
            console.log("  S3_BUCKET_NAME       - S3 Bucket name (default: mis-dev)\n");
            break;
        }
    }
}

main().catch(console.error);