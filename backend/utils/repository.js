import fs from "fs";
import path from "path";

const MEMORY_FILE = path.resolve("backend/data/chat_memory.json");

export function getRepository() {
  return "json";
}

export function isDatabaseEnabled() {
  return false;
}

export function loadMemory() {

  try {

    if (!fs.existsSync(MEMORY_FILE)) {
      return {};
    }

    const raw = fs.readFileSync(MEMORY_FILE, "utf-8");

    return JSON.parse(raw);

  } catch {
    return {};
  }

}

export function saveMemory(memory) {

  try {

    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify(memory, null, 2),
      "utf-8"
    );

  } catch {}

}