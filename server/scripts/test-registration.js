import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { io as ioClient } from "socket.io-client";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, "..", "server.js");
const MIGRATION_ENTRY = path.join(__dirname, "drop-email-unique-index.js");

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const runScript = async (entry, env, timeoutMs = 120000) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (out += d.toString()));
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Script ${entry} timed out. Output:\n${out}`));
    }, timeoutMs);
    child.on("exit", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`Script ${entry} exited with ${code}. Output:\n${out}`));
    });
  });

let mongoServer;
let serverProc;
let serverPort;

const getFreePort = async () => {
  const net = await import("node:net");
  for (let port = 51234; port < 51260; port++) {
    const ok = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(false));
      srv.once("listening", () => srv.close(() => resolve(true)));
      srv.listen(port, "127.0.0.1");
    });
    if (ok) return port;
  }
  throw new Error("No free port found");
};

try {
  console.log("== Starting in-memory MongoDB (first run downloads mongod binary) ==");
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri("chatverse_test");

  console.log("== Booting the real ChatVerse server against it ==");
  serverPort = await getFreePort();
  serverProc = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      MONGODB_URL: mongoUri,
      PORT: String(serverPort),
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-for-registration-tests",
      JWT_EXPIRES_IN: "2d",
      JWT_COOKIE_EXPIRES_IN: "2",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let bootOut = "";
  serverProc.stdout.on("data", (d) => (bootOut += d.toString()));
  serverProc.stderr.on("data", (d) => (bootOut += d.toString()));

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server boot timed out. Output:\n${bootOut}`)), 90000);
    serverProc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited early (${code}). Output:\n${bootOut}`));
    });
    const probe = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${serverPort}/.well-known/appspecific/com.chrome.devtools.json`);
        if (res.status === 204) {
          clearTimeout(timer);
          resolve();
          return;
        }
      } catch {}
      setTimeout(probe, 400);
    };
    probe();
  });

  const base = `http://127.0.0.1:${serverPort}/api/v1/user`;
  console.log(`Server ready on port ${serverPort}\n`);

  const post = async (url, body, cookie) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
  };
  const get = async (url, cookie) => {
    const res = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  };

  // Scenario 1: new username + 4-char password -> success
  const r1 = await post(`${base}/register`, { fullName: "Test One", username: "testone", password: "1234", gender: "male" });
  record("1. Register (4-char password)", r1.status === 201 && r1.data?.success === true, `status=${r1.status} msg=${r1.data?.message}`);

  // Scenario 5/10: new user without email -> success (r1 already had no email)
  record("5/10. Register without email", r1.status === 201, `user has no email field in response`);

  // Scenario 2: password shorter than 4 -> fails
  const r2 = await post(`${base}/register`, { fullName: "Test Two", username: "testtwo", password: "abc", gender: "male" });
  record("2. Register (3-char password rejected)", r2.status === 400 && /at least 4 characters/.test(r2.data?.message), `status=${r2.status} msg=${r2.data?.message}`);

  // Scenario 3: duplicate username -> fails with clear error
  const r3 = await post(`${base}/register`, { fullName: "Test One Dup", username: "testone", password: "abcd", gender: "male" });
  record("3. Duplicate username rejected", r3.status === 400 && r3.data?.message === "Username already exists", `status=${r3.status} msg=${r3.data?.message}`);

  // Scenario: username is trimmed on registration; padded duplicate also rejected
  const rTrim = await post(`${base}/register`, { fullName: "Trim User", username: "  trimuser  ", password: "abcd", gender: "male" });
  const rTrimDup = await post(`${base}/register`, { fullName: "Trim Dup", username: " trimuser", password: "abcd", gender: "male" });
  record("3b. Username trimmed on registration", rTrim.status === 201 && rTrim.data?.responseData?.user?.username === "trimuser", `status=${rTrim.status} username=${rTrim.data?.responseData?.user?.username}`);
  record("3c. Padded duplicate username rejected", rTrimDup.status === 400 && rTrimDup.data?.message === "Username already exists", `status=${rTrimDup.status} msg=${rTrimDup.data?.message}`);

  // Scenario 11: multiple users without email -> all succeed
  const r11a = await post(`${base}/register`, { fullName: "No Email A", username: "noemaila", password: "abcd", gender: "female" });
  const r11b = await post(`${base}/register`, { fullName: "No Email B", username: "noemailb", password: "wxyz", gender: "male" });
  record("11. Multiple email-less users register", r11a.status === 201 && r11b.status === 201, `a=${r11a.status} b=${r11b.status}`);

  // Scenario 6: login with new user's username/password (trimmed too)
  const l1 = await post(`${base}/login`, { username: "testone", password: "1234" });
  record("6. Login with new user username", l1.status === 200 && l1.data?.success === true && !!l1.setCookie, `status=${l1.status}`);
  const l1b = await post(`${base}/login`, { username: "  testone  ", password: "1234" });
  record("6b. Login trims username", l1b.status === 200, `status=${l1b.status}`);
  const tokenCookie = l1.setCookie?.split(";")[0] || "";

  // Scenario 7: legacy user (has email) still logs in via username; email login is gone
  await mongoose.connect(mongoUri);
  const legacy = await mongoose.connection.collection("users").insertOne({
    fullName: "Legacy User",
    username: "legacyuser",
    email: "legacy@example.com",
    password: await bcrypt.hash("OldPass9!", 10),
    gender: "male",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await mongoose.disconnect();
  const lEmail = await post(`${base}/login`, { username: "legacy@example.com", password: "OldPass9!" });
  const l3 = await post(`${base}/login`, { username: "legacyuser", password: "OldPass9!" });
  record("7. Legacy user login via username", l3.status === 200, `status=${l3.status}`);
  record("7b. Email login no longer accepted", lEmail.status === 400, `status=${lEmail.status} msg=${lEmail.data?.message}`);

  // Scenario 8: refresh -> token cookie still authenticates (get-profile)
  const g1 = await get(`${base}/get-profile`, tokenCookie);
  record("8. Auth persists after refresh (get-profile with cookie)", g1.status === 200 && g1.data?.success === true, `status=${g1.status}`);

  // Scenario: wrong username / wrong password
  const w1 = await post(`${base}/login`, { username: "nobodyknowsme", password: "1234" });
  const w2 = await post(`${base}/login`, { username: "testone", password: "wrong" });
  record("8b. Wrong username rejected", w1.status === 400 && w1.data?.message === "Invalid credentials", `status=${w1.status} msg=${w1.data?.message}`);
  record("8c. Wrong password rejected", w2.status === 400 && w2.data?.message === "Invalid credentials", `status=${w2.status} msg=${w2.data?.message}`);

  // Scenario 10: logout clears the auth cookie
  const lo = await post(`${base}/logout`, {}, tokenCookie);
  record("10. Logout succeeds and clears cookie", lo.status === 200 && /token=;/.test(lo.setCookie || ""), `status=${lo.status}`);
  const lAfterLogout = await post(`${base}/login`, { username: "testone", password: "1234" });
  record("10b. Login still works after logout", lAfterLogout.status === 200, `status=${lAfterLogout.status}`);

  // Scenario 9: password is bcrypt hashed in DB
  await mongoose.connect(mongoUri);
  const stored = await mongoose.connection.collection("users").findOne({ username: "testone" });
  await mongoose.disconnect();
  const hashOk = stored && stored.password !== "1234" && /^\$2[aby]\$/.test(stored.password) && (await bcrypt.compare("1234", stored.password));
  record("9. Password bcrypt-hashed in DB", !!hashOk, `hash=${stored?.password?.slice(0, 7)}...`);
  record("9b. No email stored for new user", stored && stored.email === undefined, `email=${JSON.stringify(stored?.email)}`);

  // change-password enforces min 4 too
  const cp = await post(`${base}/change-password`, { currentPassword: "1234", newPassword: "abc", confirmPassword: "abc" }, tokenCookie);
  record("4b. change-password rejects 3-char password", cp.status === 400 && /at least 4 characters/.test(cp.data?.message), `status=${cp.status} msg=${cp.data?.message}`);

  // Scenario 13-15: chat, messages and Socket.IO still work end-to-end
  const msgBase = `http://127.0.0.1:${serverPort}/api/v1/message`;
  const regA = await post(`${base}/register`, { fullName: "Chat User A", username: "chatusera", password: "abcd", gender: "male" });
  const regB = await post(`${base}/register`, { fullName: "Chat User B", username: "chatuserb", password: "abcd", gender: "female" });
  const userAId = regA.data?.responseData?.user?._id;
  const userBId = regB.data?.responseData?.user?._id;
  const cookieA = (await post(`${base}/login`, { username: "chatusera", password: "abcd" })).setCookie?.split(";")[0] || "";
  const cookieB = (await post(`${base}/login`, { username: "chatuserb", password: "abcd" })).setCookie?.split(";")[0] || "";

  const socketA = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userAId }, transports: ["websocket"], reconnection: false });
  const socketB = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userBId }, transports: ["websocket"], reconnection: false });
  const waitConnect = (sock) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("socket connect timeout")), 15000);
    sock.once("connect", () => { clearTimeout(t); resolve(); });
    sock.once("connect_error", (e) => { clearTimeout(t); reject(new Error(`connect_error: ${e.message}`)); });
  });
  let sockConnOk = true;
  try {
    await Promise.all([waitConnect(socketA), waitConnect(socketB)]);
  } catch (err) {
    sockConnOk = false;
    console.error("socket error:", err.message);
  }
  record("15. Socket.IO connects for both users", sockConnOk);

  let socketMsgReceived = false;
  const gotNewMessage = new Promise((resolve) => {
    socketB.once("newMessage", (msg) => {
      socketMsgReceived = msg?.message === "hello from A";
      resolve();
    });
  });

  const sm = await fetch(`${msgBase}/send/${userBId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieA },
    body: JSON.stringify({ message: "hello from A" }),
  });
  const smData = await sm.json().catch(() => null);
  record("13. Send message works (auth cookie)", sm.status === 200 && smData?.success === true, `status=${sm.status}`);

  await Promise.race([gotNewMessage, new Promise((r) => setTimeout(r, 15000))]);
  record("15b. Receiver socket gets 'newMessage' event", socketMsgReceived);

  const gm = await fetch(`${msgBase}/get-messages/${userAId}`, { headers: { Cookie: cookieB } });
  const gmData = await gm.json().catch(() => null);
  const msgs = gmData?.responseData?.messages || [];
  record("14. Messages retrievable (get-messages)", gm.status === 200 && msgs.some((m) => m.message === "hello from A"), `status=${gm.status} count=${msgs.length}`);

  const conv = await fetch(`${msgBase}/conversations`, { headers: { Cookie: cookieA } });
  const convData = await conv.json().catch(() => null);
  record("14b. Conversation list works", conv.status === 200 && Array.isArray(convData?.responseData) && convData.responseData.length >= 1, `status=${conv.status} count=${convData?.responseData?.length}`);

  socketA.close();
  socketB.close();

  // Scenario: legacy unique email index (as in the old deployed schema) blocks
  // email-less users until the migration drops it. Fresh collection to mimic
  // the production state where ALL existing users have emails.
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  await db.collection("users").drop().catch(() => {});
  await db.collection("users").insertOne({
    fullName: "Old User With Email",
    username: "olduser",
    email: "olduser@example.com",
    password: await bcrypt.hash("OldPass9!", 10),
    gender: "male",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await mongoose.disconnect();

  const idxUser1 = await post(`${base}/register`, { fullName: "No Mail One", username: "nomailone", password: "abcd", gender: "male" });
  const idxUser2 = await post(`${base}/register`, { fullName: "No Mail Two", username: "nomailtwo", password: "abcd", gender: "male" });
  record("11b. Legacy unique email index blocks 2nd email-less user", idxUser1.status === 201 && idxUser2.status === 400, `1st=${idxUser1.status} 2nd=${idxUser2.status} msg=${idxUser2.data?.message}`);

  const migOut = await runScript(MIGRATION_ENTRY, { MONGODB_URL: mongoUri });
  record("11c. Migration script drops unique email index", /Dropped unique index/.test(migOut), migOut.trim().split("\n").pop());

  const after = await post(`${base}/register`, { fullName: "Index Freed", username: "idxfreed", password: "abcd", gender: "male" });
  record("11d. Email-less registration works after index drop", after.status === 201, `status=${after.status}`);

  const migOut2 = await runScript(MIGRATION_ENTRY, { MONGODB_URL: mongoUri });
  record("11e. Migration is idempotent (no index -> no-op)", /nothing to do/.test(migOut2), migOut2.trim().split("\n").pop());

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n== ${passed}/${results.length} scenarios passed ==`);
  process.exitCode = passed === results.length ? 0 : 1;
} catch (err) {
  console.error("FATAL:", err.message);
  process.exitCode = 1;
} finally {
  if (serverProc) serverProc.kill();
  await mongoose.disconnect().catch(() => {});
  if (mongoServer) await mongoServer.stop().catch(() => {});
  setTimeout(() => process.exit(process.exitCode || 0), 3000);
}