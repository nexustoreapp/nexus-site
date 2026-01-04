// backend/utils/userStore.js
import fs from "fs";
import path from "path";

const USERS_PATH = path.resolve("backend/data/users.json");

export function ensureUsersFile() {
  const dir = path.dirname(USERS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, "[]", "utf-8");
}

export function readUsers() {
  ensureUsersFile();
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
}

export function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf-8");
}

export function findUserByEmail(email) {
  const users = readUsers();
  return users.find(u => u.email === email) || null;
}

export function findUserByCPF(cpf) {
  const users = readUsers();
  return users.find(u => u.cpf === cpf) || null;
}

export function upsertUser(user) {
  const users = readUsers();
  const idx = users.findIndex(u => u.email === user.email);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  writeUsers(users);
}