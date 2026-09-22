import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { env } from "./env";

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (_request, _file, callback) => {
    callback(null, `${randomUUID()}.pdf`);
  }
});

const isPdf = (file: Express.Multer.File): boolean => {
  const extension = path.extname(file.originalname).toLowerCase();
  return extension === ".pdf" && file.mimetype === "application/pdf";
};

export const uploadResume = multer({
  storage,
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 1
  },
  fileFilter: (_request, file, callback) => {
    if (!isPdf(file)) {
      callback(new Error("INVALID_FILE_TYPE"));
      return;
    }

    callback(null, true);
  }
});
