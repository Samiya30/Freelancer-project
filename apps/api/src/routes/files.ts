import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const router = Router();

const uploadDirectory = path.resolve(
  process.cwd(),
  "uploads"
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${extension}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const fileTypeSchema = z.enum([
  "PDF",
  "DOC",
  "XLS",
  "IMAGE",
  "ZIP",
  "CODE",
  "OTHER",
]);

const createFileSchema = z.object({
  folder: z.string().trim().min(1).max(200).default("General"),
  shared: z.coerce.boolean().default(false),

  client: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),

  project: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),

  clientId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  projectId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});

const updateFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional(),

  folder: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),

  shared: z.coerce.boolean().optional(),

  client: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),

  project: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .optional(),

  clientId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  projectId: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),
});

async function getDemoUser() {
  return prisma.user.upsert({
    where: {
      email: "demo@freelanceos.local",
    },

    update: {},

    create: {
      name: "Demo Freelancer",
      email: "demo@freelanceos.local",
    },
  });
}

function detectFileType(filename: string) {
  const extension = path
    .extname(filename)
    .replace(".", "")
    .toLowerCase();

  if (extension === "pdf") {
    return "PDF";
  }

  if (["doc", "docx"].includes(extension)) {
    return "DOC";
  }

  if (
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    return "XLS";
  }

  if (
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "svg",
    ].includes(extension)
  ) {
    return "IMAGE";
  }

  if (
    ["zip", "rar", "7z"].includes(extension)
  ) {
    return "ZIP";
  }

  if (
    [
      "js",
      "ts",
      "tsx",
      "jsx",
      "html",
      "css",
      "json",
      "md",
    ].includes(extension)
  ) {
    return "CODE";
  }

  return "OTHER";
}

async function validateRelations(
  userId: number,
  clientId: number | null | undefined,
  projectId: number | null | undefined
) {
  let client = null;
  let project = null;

  if (
    clientId !== undefined &&
    clientId !== null
  ) {
    client = await prisma.client.findFirst({
      where: {
        id: clientId,
        userId,
      },
    });

    if (!client) {
      return {
        valid: false,
        message: "Client not found.",
        client: null,
        project: null,
      };
    }
  }

  if (
    projectId !== undefined &&
    projectId !== null
  ) {
    project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      return {
        valid: false,
        message: "Project not found.",
        client,
        project: null,
      };
    }

    if (
      clientId !== undefined &&
      clientId !== null &&
      project.clientId !== null &&
      project.clientId !== clientId
    ) {
      return {
        valid: false,
        message:
          "Project does not belong to the selected client.",
        client,
        project,
      };
    }
  }

  return {
    valid: true,
    message: "",
    client,
    project,
  };
}

/**
 * GET /api/files
 */
router.get("/", async (_req, res) => {
  try {
    const user = await getDemoUser();

    const files = await prisma.file.findMany({
      where: {
        userId: user.id,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error(
      "GET /api/files error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch files.",
    });
  }
});

/**
 * GET /api/files/:id/download
 *
 * IMPORTANT:
 * This route must appear before /:id
 * so "download" is handled correctly.
 */
router.get(
  "/:id/download",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file ID.",
        });
      }

      const user = await getDemoUser();

      const file = await prisma.file.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: "File not found.",
        });
      }

      const filePath = path.join(
        uploadDirectory,
        path.basename(file.storagePath)
      );

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message:
            "Stored file could not be found.",
        });
      }

      return res.download(
        filePath,
        file.name
      );
    } catch (error) {
      console.error(
        "GET /api/files/:id/download error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to download file.",
      });
    }
  }
);

/**
 * POST /api/files/:id/duplicate
 */
router.post(
  "/:id/duplicate",
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid file ID.",
        });
      }

      const user = await getDemoUser();

      const existingFile =
        await prisma.file.findFirst({
          where: {
            id,
            userId: user.id,
          },
        });

      if (!existingFile) {
        return res.status(404).json({
          success: false,
          message: "File not found.",
        });
      }

      const sourcePath = path.join(
        uploadDirectory,
        path.basename(
          existingFile.storagePath
        )
      );

      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({
          success: false,
          message:
            "Stored file could not be found.",
        });
      }

      const extension = path.extname(
        existingFile.name
      );

      const newStorageName = `${crypto.randomUUID()}${extension}`;

      const destinationPath = path.join(
        uploadDirectory,
        newStorageName
      );

      fs.copyFileSync(
        sourcePath,
        destinationPath
      );

      try {
        const duplicate =
          await prisma.file.create({
            data: {
              name: `Copy of ${existingFile.name}`,
              type: existingFile.type,
              size: existingFile.size,
              storagePath: newStorageName,
              folder: existingFile.folder,
              shared: false,
              client: existingFile.client,
              project: existingFile.project,
              clientId: existingFile.clientId,
              projectId: existingFile.projectId,
              userId: user.id,
            },
          });

        return res.status(201).json({
          success: true,
          message:
            "File duplicated successfully.",
          data: duplicate,
        });
      } catch (error) {
        try {
          fs.unlinkSync(destinationPath);
        } catch {
          // Ignore cleanup errors.
        }

        throw error;
      }
    } catch (error) {
      console.error(
        "POST /api/files/:id/duplicate error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to duplicate file.",
      });
    }
  }
);

/**
 * GET /api/files/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const user = await getDemoUser();

    const file = await prisma.file.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    return res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    console.error(
      "GET /api/files/:id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch file.",
    });
  }
});

/**
 * POST /api/files/upload
 *
 * Upload binary file + create metadata.
 */
router.post(
  "/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file was uploaded.",
        });
      }

      const parsed = createFileSchema.safeParse(
        req.body
      );

      if (!parsed.success) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors.
        }

        return res.status(400).json({
          success: false,
          message: "Invalid file data.",
          errors: parsed.error.flatten(),
        });
      }

      const data = parsed.data;
      const user = await getDemoUser();

      const relations =
        await validateRelations(
          user.id,
          data.clientId,
          data.projectId
        );

      if (!relations.valid) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors.
        }

        return res.status(400).json({
          success: false,
          message: relations.message,
        });
      }

      const detectedType =
        detectFileType(
          req.file.originalname
        );

      const typeValidation =
        fileTypeSchema.safeParse(
          detectedType
        );

      if (!typeValidation.success) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors.
        }

        return res.status(400).json({
          success: false,
          message: "Unsupported file type.",
        });
      }

      const file =
        await prisma.file.create({
          data: {
            name: req.file.originalname,
            type: typeValidation.data,
            size: req.file.size,
            storagePath: req.file.filename,
            folder: data.folder,
            shared: data.shared,

            ...(data.client !== undefined
              ? {
                  client: data.client,
                }
              : {}),

            ...(data.project !== undefined
              ? {
                  project: data.project,
                }
              : {}),

            ...(data.clientId !== undefined
              ? {
                  clientId: data.clientId,
                }
              : {}),

            ...(data.projectId !== undefined
              ? {
                  projectId: data.projectId,
                }
              : {}),

            userId: user.id,
          },
        });

      return res.status(201).json({
        success: true,
        message:
          "File uploaded successfully.",
        data: file,
      });
    } catch (error) {
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // Ignore cleanup errors.
        }
      }

      console.error(
        "POST /api/files/upload error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to upload file.",
      });
    }
  }
);

/**
 * PATCH /api/files/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const parsed =
      updateFileSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid file data.",
        errors: parsed.error.flatten(),
      });
    }

    const data = parsed.data;
    const user = await getDemoUser();

    const existingFile =
      await prisma.file.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!existingFile) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const relations =
      await validateRelations(
        user.id,
        data.clientId,
        data.projectId
      );

    if (!relations.valid) {
      return res.status(400).json({
        success: false,
        message: relations.message,
      });
    }

    const file =
      await prisma.file.update({
        where: {
          id,
        },

        data: {
          ...(data.name !== undefined
            ? {
                name: data.name,
              }
            : {}),

          ...(data.folder !== undefined
            ? {
                folder: data.folder,
              }
            : {}),

          ...(data.shared !== undefined
            ? {
                shared: data.shared,
              }
            : {}),

          ...(data.client !== undefined
            ? {
                client: data.client,
              }
            : {}),

          ...(data.project !== undefined
            ? {
                project: data.project,
              }
            : {}),

          ...(data.clientId !== undefined
            ? {
                clientId: data.clientId,
              }
            : {}),

          ...(data.projectId !== undefined
            ? {
                projectId: data.projectId,
              }
            : {}),
        },
      });

    return res.json({
      success: true,
      message:
        "File updated successfully.",
      data: file,
    });
  } catch (error) {
    console.error(
      "PATCH /api/files/:id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update file.",
    });
  }
});

/**
 * DELETE /api/files/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID.",
      });
    }

    const user = await getDemoUser();

    const existingFile =
      await prisma.file.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

    if (!existingFile) {
      return res.status(404).json({
        success: false,
        message: "File not found.",
      });
    }

    const filePath = path.join(
      uploadDirectory,
      path.basename(
        existingFile.storagePath
      )
    );

    await prisma.file.delete({
      where: {
        id,
      },
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.json({
      success: true,
      message:
        "File deleted successfully.",
    });
  } catch (error) {
    console.error(
      "DELETE /api/files/:id error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete file.",
    });
  }
});

export default router;