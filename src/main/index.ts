import { app, BrowserWindow, ipcMain, shell } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentHost } from "./agent-host";
import {
  IPC,
  type AuthAnswer,
  type ChatEvent,
  type LoginInput,
  type ModelRef,
  type ThinkingLevel,
} from "../shared/protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.SESSIONS_CDP) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.SESSIONS_CDP);
}

let host: AgentHost | undefined;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Sessions",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return win;
}

app.whenReady().then(async () => {
  let win: BrowserWindow | undefined;
  host = new AgentHost(
    {
      dataDir: join(app.getPath("userData"), "pi"),
      cwd: process.cwd(),
    },
    (event: ChatEvent) => {
      win?.webContents.send(IPC.event, event);
    },
    (url) => {
      void shell.openExternal(url);
    },
  );
  await host.start();

  ipcMain.handle(IPC.status, () => host?.status());
  ipcMain.handle(IPC.login, (_event, input: LoginInput) => host?.login(input));
  ipcMain.handle(IPC.answerAuth, (_event, input: AuthAnswer) => host?.answerAuth(input));
  ipcMain.handle(IPC.setModel, (_event, input: ModelRef) => host?.setModel(input));
  ipcMain.handle(IPC.setThinking, (_event, level: ThinkingLevel) =>
    host?.setThinkingLevel(level),
  );
  ipcMain.handle(IPC.prompt, (_event, text: string) => host?.prompt(text));
  ipcMain.handle(IPC.abort, () => host?.abort());

  win = createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) win = createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  host?.dispose();
});
