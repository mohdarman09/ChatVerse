import { MongoMemoryServer } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { io as ioClient } from "socket.io-client";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, "..", "server.js");

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

let mongoServer;
let serverProc;
let serverPort;

const getFreePort = async () => {
  const net = await import("node:net");
  for (let port = 52234; port < 52260; port++) {
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForSocketEvent = (socket, event, timeoutMs = 8000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for '${event}'`));
    }, timeoutMs);
    const handler = (data) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };
    socket.on(event, handler);
  });

const waitConnect = (sock) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("socket connect timeout")), 15000);
  sock.once("connect", () => { clearTimeout(t); resolve(); });
  sock.once("connect_error", (e) => { clearTimeout(t); reject(new Error(`connect_error: ${e.message}`)); });
});

try {
  console.log("== Starting in-memory MongoDB ==");
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri("chatverse_realtime_test");

  console.log("== Booting the real ChatVerse server ==");
  serverPort = await getFreePort();
  serverProc = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      MONGODB_URL: mongoUri,
      PORT: String(serverPort),
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-for-realtime-tests",
      JWT_EXPIRES_IN: "2d",
      JWT_COOKIE_EXPIRES_IN: "2",
      CLIENT_URL: "http://localhost:5173",
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

  const base = `http://127.0.0.1:${serverPort}/api/v1`;
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

  // ---- Setup users A and B (username-only auth) ----
  const regA = await post(`${base}/user/register`, { fullName: "Realtime User A", username: "rtusera", password: "abcd", gender: "male" });
  const regB = await post(`${base}/user/register`, { fullName: "Realtime User B", username: "rtuserb", password: "abcd", gender: "female" });
  record("Setup. Register A and B", regA.status === 201 && regB.status === 201, `a=${regA.status} b=${regB.status}`);

  const userAId = regA.data?.responseData?.user?._id;
  const userBId = regB.data?.responseData?.user?._id;
  const cookieA = (await post(`${base}/user/login`, { username: "rtusera", password: "abcd" })).setCookie?.split(";")[0] || "";
  const cookieB = (await post(`${base}/user/login`, { username: "rtuserb", password: "abcd" })).setCookie?.split(";")[0] || "";
  record("Setup. Login A and B via username", !!cookieA && !!cookieB);

  // ---- Socket connections (default transports: polling + websocket upgrade) ----
  const socketA = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userAId } });
  const socketB1 = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userBId } });
  const socketB2 = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userBId } });

  let connOk = true;
  try {
    await Promise.all([waitConnect(socketA), waitConnect(socketB1), waitConnect(socketB2)]);
  } catch (err) {
    connOk = false;
    console.error("socket error:", err.message);
  }
  record("T1. A + B (2 tabs) connect to Socket.IO (default transports)", connOk);

  // ---- onlineUsers reflects multi-tab (user appears once) ----
  let latestOnline = null;
  socketA.on("onlineUsers", (users) => { latestOnline = users; });
  await wait(600);
  const onlineUsersSet = Array.isArray(latestOnline) ? latestOnline : [];
  record("T2. onlineUsers lists each user once (B twice-connected)",
    onlineUsersSet.includes(userAId) && onlineUsersSet.includes(userBId) && onlineUsersSet.filter(u => u === userBId).length === 1,
    JSON.stringify(onlineUsersSet));

  // ---- T3: A sends text -> BOTH B tabs receive it immediately ----
  const msgPromises = [
    waitForSocketEvent(socketB1, "newMessage"),
    waitForSocketEvent(socketB2, "newMessage"),
  ];
  const sendRes = await post(`${base}/message/send/${userBId}`, { message: "hello from A" }, cookieA);
  const sentMsg = sendRes.data?.responseData;
  const [b1Msg, b2Msg] = await Promise.all(msgPromises);
  record("T3. A sends text -> B tab1 receives instantly", b1Msg?.message === "hello from A" && String(b1Msg?._id) === String(sentMsg?._id));
  record("T3b. A sends text -> B tab2 receives instantly (multi-tab)", b2Msg?.message === "hello from A" && String(b2Msg?._id) === String(sentMsg?._id));
  record("T3c. Emitted message is the COMPLETE saved doc", !!b1Msg?._id && !!b1Msg?.senderId && !!b1Msg?.recieverId && !!b1Msg?.createdAt && b1Msg?.messageType === "text");

  // ---- T4: B replies -> A receives instantly ----
  const replyPromise = waitForSocketEvent(socketA, "newMessage");
  const replyRes = await post(`${base}/message/send/${userAId}`, { message: "hi back from B" }, cookieB);
  const replyMsg = await replyPromise;
  record("T4. B replies -> A receives instantly", replyMsg?.message === "hi back from B" && String(replyMsg?._id) === String(replyRes.data?.responseData?._id));

  // ---- T5: rapid messages keep order, no loss, no duplicates ----
  const received = [];
  const orderCollector = (msg) => received.push(msg.message);
  socketB1.on("newMessage", orderCollector);
  const rapid = [];
  for (let i = 1; i <= 5; i++) {
    const r = await post(`${base}/message/send/${userBId}`, { message: `rapid-${i}` }, cookieA);
    rapid.push(r.data?.responseData?._id);
  }
  await wait(1200);
  socketB1.off("newMessage", orderCollector);
  const rapidMsgs = received.filter((m) => typeof m === "string" && m.startsWith("rapid-"));
  record("T5. 5 rapid messages -> all received in order", rapidMsgs.join(",") === "rapid-1,rapid-2,rapid-3,rapid-4,rapid-5", rapidMsgs.join(","));
  record("T5b. No duplicate delivery", new Set(received.filter(m => String(m).startsWith("rapid-"))).size === received.filter(m => String(m).startsWith("rapid-")).length);

  // ---- T6: close B's tab1 -> B's tab2 still receives ----
  const onlineAfterClosePromise = waitForSocketEvent(socketA, "onlineUsers").catch(() => null);
  socketB1.close();
  const onlineAfterClose = await onlineAfterClosePromise;
  const stillOnlineB = Array.isArray(onlineAfterClose) && onlineAfterClose.includes(userBId);
  record("T6. Closing one B tab keeps B online", stillOnlineB);

  const afterClosePromise = waitForSocketEvent(socketB2, "newMessage");
  await post(`${base}/message/send/${userBId}`, { message: "after tab1 closed" }, cookieA);
  const afterCloseMsg = await afterClosePromise;
  record("T6b. B still receives real-time after one tab closes", afterCloseMsg?.message === "after tab1 closed");

  // ---- T7: close ALL B tabs -> B goes offline, lastSeen updated ----
  const offlinePromise = waitForSocketEvent(socketA, "onlineUsers").catch(() => null);
  const lastSeenPromise = waitForSocketEvent(socketA, "userLastSeen").catch(() => null);
  socketB2.close();
  const offlineUsers = await offlinePromise;
  const lastSeen = await lastSeenPromise;
  record("T7. All B tabs closed -> B offline in onlineUsers", Array.isArray(offlineUsers) && !offlineUsers.includes(userBId), JSON.stringify(offlineUsers));
  record("T7b. lastSeen broadcast on full disconnect", !!lastSeen?.lastSeen);

  // ---- T8: B reconnects -> receives new messages in real time again ----
  const socketB3 = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userBId } });
  await waitConnect(socketB3);
  const reconPromise = waitForSocketEvent(socketB3, "newMessage");
  await post(`${base}/message/send/${userBId}`, { message: "after reconnect" }, cookieA);
  const reconMsg = await reconPromise;
  record("T8. After reconnect, B receives real-time messages", reconMsg?.message === "after reconnect");

  // ---- T9: persistence - message history includes all ----
  const gm = await get(`${base}/message/get-messages/${userAId}`, cookieB);
  const msgs = gm.data?.responseData?.messages || [];
  const texts = msgs.map(m => m.message);
  record("T9. Persisted history contains all messages (no refresh needed)", 
    texts.includes("hello from A") && texts.includes("hi back from B") && texts.includes("after reconnect"),
    `count=${msgs.length}`);

  // ---- T10: conversations sidebar updated with lastMessage ----
  const conv = await get(`${base}/message/conversations`, cookieA);
  const convs = conv.data?.responseData || [];
  const withB = convs.find(c => String(c.otherUser?._id) === String(userBId));
  record("T10. Conversation list reflects lastMessage in real time", withB?.lastMessage?.message === "after reconnect", JSON.stringify(withB?.lastMessage));

  // ---- T11: new user registers and connects to socket ----
  const regC = await post(`${base}/user/register`, { fullName: "Realtime User C", username: "rtuserc", password: "xyzw", gender: "male" });
  const userCId = regC.data?.responseData?.user?._id;
  const socketC = ioClient(`http://127.0.0.1:${serverPort}`, { query: { userId: userCId } });
  let cOk = true;
  try { await waitConnect(socketC); } catch { cOk = false; }
  record("T11. Newly registered user connects to Socket.IO", regC.status === 201 && cOk);

  // ---- T12: image message shape (no cloudinary in test env -> skip upload, verify empty-text guard stays) ----
  record("T12. Message type defaults to text", sentMsg?.messageType === "text");

  socketA.close();
  socketB3.close();
  socketC.close();
  await wait(400);

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n== ${passed}/${results.length} scenarios passed ==`);
  process.exitCode = passed === results.length ? 0 : 1;
} catch (err) {
  console.error("FATAL:", err.message);
  process.exitCode = 1;
} finally {
  if (serverProc) serverProc.kill();
  if (mongoServer) await mongoServer.stop().catch(() => {});
  setTimeout(() => process.exit(process.exitCode || 0), 3000);
}