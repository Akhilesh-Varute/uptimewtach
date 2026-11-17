import * as net from "net";
import { assertPublicHost, safeLookup } from "./netguard";

export type TcpResult = {
  status: "up" | "down";
  response_time_ms: number | null;
  error_message: string | null;
};

export async function checkTcp(host: string, port: number, timeoutMs = 10000): Promise<TcpResult> {
  try {
    await assertPublicHost(host);
  } catch (e) {
    return { status: "down", response_time_ms: null, error_message: e instanceof Error ? e.message : "Blocked" };
  }
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    function finish(result: TcpResult) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    }

    socket.setTimeout(timeoutMs);

    socket.connect({ port, host, lookup: safeLookup }, () => {
      finish({
        status: "up",
        response_time_ms: Date.now() - start,
        error_message: null,
      });
    });

    socket.on("error", (err) => {
      finish({
        status: "down",
        response_time_ms: Date.now() - start,
        error_message: err.message,
      });
    });

    socket.on("timeout", () => {
      finish({
        status: "down",
        response_time_ms: null,
        error_message: "Connection timed out",
      });
    });
  });
}
