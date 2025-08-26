export interface ImageAttachment {
  id: string;
  name: string;
  mime: string; // e.g., image/png
  dataBase64: string; // raw base64 without data: prefix
  size: number;
}
