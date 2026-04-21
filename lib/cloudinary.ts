function getCloudinaryCloudName(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
    );
  }

  return cloudName;
}

export function getOptimizedImage(publicId: string): string {
  if (!publicId) {
    throw new Error("Cloudinary publicId is required.");
  }

  const cloudName = getCloudinaryCloudName();
  const encodedPublicId = encodeURIComponent(publicId);

  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_800/${encodedPublicId}`;
}
