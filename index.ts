#! /usr/bin/env bun

import fs from "fs/promises";
import crypto from "crypto";
import { join } from "path";

async function isValidDirectory(path: string) {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch (_) {
    return false;
  }
}
const folderPath = process.argv[2];
if (!folderPath) {
  console.log("Please provide a folder path path as an argument");
  process.exit(1);
}

async function getFilesInDirectory(path: string) {
  let files: string[] = [];
  try {
    const items = await fs.readdir(path);
    for await (const item of items) {
      const fullPath = join(path, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        // sub files
        const subdirFiles = await getFilesInDirectory(fullPath);
        files = [...files, ...subdirFiles];
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error("Error reading directory");
  }
  return files;
}
//  Get the hash of a file :)
const getFileHash = async (filePath: string) => {
  const hash = crypto.createHash("sha256");
  const fileBuffer = await fs.readFile(filePath);
  hash.update(new Uint8Array(fileBuffer));
  return hash.digest("hex");
};

async function findAndDeleteDuplicates(folderPath: string) {
  const files = await getFilesInDirectory(folderPath);
  const fileHashes: Record<string, string[]> = {};

  const hashPromises = files.map(async (file) => {
    const hash = await getFileHash(file);
    if (fileHashes[hash]) {
      fileHashes[hash].push(file);
    } else {
      fileHashes[hash] = [file];
    }
  });

  await Promise.all(hashPromises); // Parallel hash calculation

  let duplicateFound = false;
  Object.keys(fileHashes).forEach(async (hash) => {
    const fileGroup = fileHashes[hash];
    if (fileGroup.length > 1) {
      duplicateFound = true;
      console.log(`Duplicate files found`);
      console.log(fileGroup.join("\n"));
      for (let i = 1; i < fileGroup.length; i++) {
        try {
          await fs.rm(fileGroup[i]);
        } catch (error) {
          console.error(`Error deleting file: ${fileGroup[i]}`, error);
        }
      }
    }
  });
  if (!duplicateFound) {
    console.log("No duplicates found.");
  }
}

if (await isValidDirectory(folderPath)) {
  await findAndDeleteDuplicates(folderPath);
} else {
  process.exit(1);
}
