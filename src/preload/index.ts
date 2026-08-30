import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC, type ChatEvent, type HostApi, type HostStatus } from "../shared/protocol";

const host: HostApi = {
  status: () => ipcRenderer.invoke(IPC.status),
  login: (input) => ipcRenderer.invoke(IPC.login, input),
  answerAuth: (input) => ipcRenderer.invoke(IPC.answerAuth, input),
  setModel: (input) => ipcRenderer.invoke(IPC.setModel, input),
  setThinkingLevel: (level) => ipcRenderer.invoke(IPC.setThinking, level),
  prompt: (text) => ipcRenderer.invoke(IPC.prompt, text),
  abort: () => ipcRenderer.invoke(IPC.abort),
  onEvent: (fn) => {
    const listen = (_event: IpcRendererEvent, event: ChatEvent) => {
      fn(event);
    };
    ipcRenderer.on(IPC.event, listen);
    return () => {
      ipcRenderer.removeListener(IPC.event, listen);
    };
  },
};

contextBridge.exposeInMainWorld("host", host);

export type { HostApi, HostStatus };
