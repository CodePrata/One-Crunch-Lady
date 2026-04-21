function getCloudinaryCloudName(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
    );
  }

  return cloudName;
}

export function getOptimizedImage(source: string): string {
  if (!source) {
    // Return an empty string or a fallback rather than throwing 
    // to prevent the entire page from crashing if an ID is missing.
    return ""; 
  }

  const cloudName = getCloudinaryCloudName();

  // CASE 1: The source is already a full Cloudinary URL
  if (source.includes("res.cloudinary.com")) {
    // If it already has transformations (contains /upload/c_ or similar), return as is
    if (source.includes("/upload/c_") || source.includes("/upload/f_")) {
      return source;
    }
    // Otherwise, inject optimizations after the '/upload/' segment
    return source.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
  }

  // CASE 2: The source is just a Public ID (e.g., 'xj18ytocrljcw0ksckej')
  const encodedPublicId = encodeURIComponent(source);
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_800/${encodedPublicId}`;
}
