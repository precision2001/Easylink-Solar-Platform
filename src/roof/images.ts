import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Where roof images wait for the background reader: the platform's own
 * private bucket (ROOF_IMAGES_BUCKET, created with the stack, images
 * deleted after 7 days). Production has no shared files bucket configured,
 * so the roof reader never depends on one.
 */
export interface RoofImages {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}

export class S3RoofImages implements RoofImages {
  constructor(
    private bucket = process.env.ROOF_IMAGES_BUCKET ?? "",
    private s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" }),
  ) {}
  async put(key: string, bytes: Uint8Array, contentType: string) {
    if (!this.bucket) throw new Error("ROOF_IMAGES_BUCKET is not set");
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }));
  }
  async get(key: string) {
    if (!this.bucket) throw new Error("ROOF_IMAGES_BUCKET is not set");
    const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return r.Body ? new Uint8Array(await r.Body.transformToByteArray()) : null;
  }
}

export class MemoryRoofImages implements RoofImages {
  stored = new Map<string, Uint8Array>();
  async put(key: string, bytes: Uint8Array) {
    this.stored.set(key, bytes);
  }
  async get(key: string) {
    return this.stored.get(key) ?? null;
  }
}
