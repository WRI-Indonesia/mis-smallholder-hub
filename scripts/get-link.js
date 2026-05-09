const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize S3 Client for IDCloudHost
const client = new S3Client({
    endpoint: "https://is3.cloudhost.id",
    region: "id-jkt-1", 
    credentials: {
        accessKeyId: process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET
    },
    forcePathStyle: true 
});

async function main() {
    const bucketName = process.env.S3_BUCKET || "mis-dev";
    const fileKey = process.argv[2];

    if (!fileKey) {
        console.log("\nError: No file path provided.");
        console.log("Usage: node get-link.js <full-path-to-file>");
        console.log('Example: node get-link.js "training/docs/file.pdf"');
        console.log('Example: node get-link.js "staff-activity/2026/05/photo.jpg"\n');
        process.exit(1);
    }

    if (!process.env.S3_KEY || !process.env.S3_SECRET) {
        console.log("Error: S3_KEY or S3_SECRET environment variables are not set.");
        process.exit(1);
    }

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        // Generate signed URL valid for 3600 seconds (1 hour)
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });

        console.log("\nSigned URL generated successfully:");
        console.log("--------------------------------------");
        console.log(url);
        console.log("--------------------------------------");
        console.log("Note: This link will expire in 60 minutes.\n");

    } catch (err) {
        console.error("S3 Error:", err.message);
    }
}

main();