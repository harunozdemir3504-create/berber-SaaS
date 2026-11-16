import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function sanitizeFilename(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!clean.endsWith(".webm") && !clean.endsWith(".mp4")) {
    return `${clean}.webm`;
  }
  return clean;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const requestedName = (formData.get("filename") as string) || "reklam.webm";
    const modeId = (formData.get("modeId") as string) || "1";

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Dosya bulunamadı" },
        { status: 400 }
      );
    }

    const filename = sanitizeFilename(requestedName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const projectDir = process.cwd();
    const targetFolder1 = path.join(projectDir, "reels-videolari");
    const targetFolder2 = path.join(projectDir, "public", "reels-videolari");

    if (!fs.existsSync(targetFolder1)) {
      fs.mkdirSync(targetFolder1, { recursive: true });
    }
    if (!fs.existsSync(targetFolder2)) {
      fs.mkdirSync(targetFolder2, { recursive: true });
    }

    const filePath1 = path.join(targetFolder1, filename);
    const filePath2 = path.join(targetFolder2, filename);

    fs.writeFileSync(filePath1, buffer);
    fs.writeFileSync(filePath2, buffer);

    return NextResponse.json({
      ok: true,
      filename,
      modeId,
      sizeBytes: buffer.length,
      sizeFormatted: `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`,
      savedPath: filePath1,
      publicUrl: `/reels-videolari/${filename}`,
    });
  } catch (error: any) {
    console.error("Save reels video error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Kayıt hatası" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projectDir = process.cwd();
    const targetFolder = path.join(projectDir, "reels-videolari");

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
      return NextResponse.json({ ok: true, files: [] });
    }

    const fileNames = fs.readdirSync(targetFolder);
    const files = fileNames
      .filter((f) => f.endsWith(".mp4") || f.endsWith(".webm"))
      .map((name) => {
        const fullPath = path.join(targetFolder, name);
        const stat = fs.statSync(fullPath);
        return {
          name,
          sizeBytes: stat.size,
          sizeFormatted: `${(stat.size / (1024 * 1024)).toFixed(2)} MB`,
          mtime: stat.mtime.toISOString(),
          publicUrl: `/reels-videolari/${name}`,
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name));

    return NextResponse.json({
      ok: true,
      folderPath: targetFolder,
      files,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Klasör okuma hatası" },
      { status: 500 }
    );
  }
}
