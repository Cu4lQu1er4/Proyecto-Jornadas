import { Injectable } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
      api_key: process.env.CLOUDINARY_API_KEY!,
      api_secret: process.env.CLOUDINARY_API_SECRET!,
    });
  }

  async uploadBuffer(
    fileBuffer: Buffer,
    mimetype: string,
    options: {
      folder?: string;
      public_id?: string;
    } = {}
  ): Promise<{
    secure_url: string;
    public_id: string;
    resource_type: string;
    format?: string;
    bytes?: number;
  }> {
    const folder =
      options.folder ??
      process.env.CLOUDINARY_FOLDER ??
      "admin-cases";

    const isPdf = mimetype === "application/pdf";

    const resource_type = isPdf ? "raw" : "image";

    const uploadOptions: any = {
      folder,
      resource_type,
      type: "upload",
      access_mode: "public",  
    };

    if (options.public_id && !isPdf) {
      uploadOptions.public_id = options.public_id;
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          if (!result)
            return reject(
              new Error("Cloudinary result undefined")
            );
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );

      stream.end(fileBuffer);
    });
  }

  getSignedUrl(params: {
    publicId: string;
    resourceType: "image" | "raw";
    format?: string | null;
  }): string {
    return cloudinary.url(params.publicId, {
      resource_type: params.resourceType,
      type: "upload",
      secure: true,
      sign_url: true,
      format:
        params.resourceType === "raw"
          ? params.format ?? "pdf"
          : undefined,
    });
  }
}