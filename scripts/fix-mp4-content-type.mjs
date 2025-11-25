import {
  S3Client,
  ListObjectsV2Command,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

const bucket = process.env.R2_BUCKET;
const prefix = process.env.R2_PREFIX || "";
const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Missing required env vars");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true,
});

async function fixObjects() {
  let ContinuationToken = undefined;
  let changed = 0;
  let scanned = 0;

  do {
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken,
      })
    );

    const objects = listRes.Contents || [];
    for (const obj of objects) {
      const key = obj.Key;
      scanned++;

      // Kun .mp4 / .MP4 filer
      if (!key.toLowerCase().endsWith(".mp4")) continue;

      console.log(`Updating Content-Type for: ${key}`);

      // CopyObject til sig selv, men med ny Content-Type
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${encodeURIComponent(key)}`,
          Key: key,
          ContentType: "video/mp4",
          MetadataDirective: "REPLACE",
        })
      );

      changed++;
    }

    ContinuationToken = listRes.IsTruncated
      ? listRes.NextContinuationToken
      : undefined;
  } while (ContinuationToken);

  console.log(`Done. Scanned ${scanned} objects, updated ${changed} MP4 files.`);
}

fixObjects().catch((err) => {
  console.error("Error while fixing MP4 Content-Type:", err);
  process.exit(1);
});
