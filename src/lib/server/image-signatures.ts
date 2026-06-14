import "server-only"

// Keep the upload-validation entry point server-only. Pure signature parsing is
// isolated so standalone regression scripts can test it without weakening this
// boundary.
export { detectMime, isAllowedImageMime } from "@/lib/image-signature-utils"
