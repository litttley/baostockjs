/**
 * Socket 工具类
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  BAOSTOCK_SERVER_IP,
  BAOSTOCK_SERVER_PORT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_SPLIT,
  MESSAGE_TYPE_GETKDATAPLUS_RESPONSE,
  BSERR_CONNECT_FAIL,
  BSERR_CONNECT_TIMEOUT,
  BSERR_SENDSOCK_FAIL,
  BSERR_SENDSOCK_TIMEOUT,
  BSERR_RECVSOCK_FAIL,
  BSERR_RECVSOCK_TIMEOUT,
  BSERR_RECVCONNECTION_CLOSED,
  BSERR_UNGZIP_DATA_FAIL,
  DELIMITER,
} from "../common/contants.js";
import { createFailResult, createSuccessResult } from "../data/resultset.js";

// 需要解压的消息类型集合
const COMPRESSED_MESSAGE_TYPE_SET = new Set([
  MESSAGE_TYPE_GETKDATAPLUS_RESPONSE,
]);

/**
 * 使用 zlib (deflate) 解压数据
 * Python 的 zlib.decompress 使用 deflate 算法
 * @param {Uint8Array} data - 压缩的数据
 * @returns {Promise<Uint8Array>} 解压后的数据
 */
async function decompressZlib(data) {
  // Deno 支持 CompressionStream，但需要 'deflate-raw' 格式
  // Python zlib 默认使用 zlib 格式（有 2 字节头 + 4 字节校验）
  // 使用 pako 或手动处理
  // 由于 Deno 内置不支持 zlib 格式，我们使用 pako 库
  // 或者使用原始 deflate 并跳过 zlib 头
  // 实际上 Python 的 zlib.decompress 接受的是 zlib 格式（带头）
  // 我们需要使用 'deflate-raw' 并手动处理 zlib 头
  // zlib 格式: 2字节头 + deflate 数据 + 4字节 Adler-32 校验
  // 跳过前2字节头和后4字节校验，使用 deflate-raw 解压中间部分
  const rawDeflateData = data.subarray(2, data.length - 4);
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  writer.write(rawDeflateData);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

const CONNECT_TIMEOUT = 10000; // 10 seconds
const SEND_TIMEOUT = 10000;
const RECV_TIMEOUT = 30000;

/**
 * 建立 TCP 连接
 * @returns {Promise<{result: ResultData, socket: Deno.TcpConn|null}>}
 */
export async function createConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECT_TIMEOUT);

    const socket = await Deno.connect({
      hostname: BAOSTOCK_SERVER_IP,
      port: BAOSTOCK_SERVER_PORT,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return { result: createSuccessResult(null), socket };
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return {
        result: createFailResult(
          BSERR_CONNECT_TIMEOUT,
          "网络连接超时",
        ),
        socket: null,
      };
    }
    return {
      result: createFailResult(
        BSERR_CONNECT_FAIL,
        `网络连接失败: ${error.message}`,
      ),
      socket: null,
    };
  }
}

/**
 * 发送消息
 * @param {Deno.TcpConn} socket - TCP 连接
 * @param {string} message - 要发送的消息
 * @returns {Promise<ResultData>}
 */
export async function sendMessage(socket, message) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message + DELIMITER);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT);

    await socket.write(data);

    clearTimeout(timeoutId);
    return createSuccessResult(null);
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return createFailResult(BSERR_SENDSOCK_TIMEOUT, "网络发送超时");
    }
    return createFailResult(
      BSERR_SENDSOCK_FAIL,
      `网络发送失败: ${error.message}`,
    );
  }
}

/**
 * 接收消息（循环读取直到遇到分隔符 \n）
 * @param {Deno.TcpConn} socket - TCP 连接
 * @returns {Promise<ResultData>} 包含接收到的字符串数据
 */
export async function receiveMessage(socket) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RECV_TIMEOUT);

    const decoder = new TextDecoder();
    let receive = new Uint8Array(0);
    const buf = new Uint8Array(8192);

    while (true) {
      const n = await socket.read(buf);

      if (n === null) {
        clearTimeout(timeoutId);
        // 如果已经收到了一些数据，尝试解析
        if (receive.length > 0) {
          const data = decoder.decode(receive);
          return createSuccessResult(data);
        }
        return createFailResult(
          BSERR_RECVCONNECTION_CLOSED,
          "网络接收时连接断开",
        );
      }

      // 合并接收到的数据
      const newReceive = new Uint8Array(receive.length + n);
      newReceive.set(receive);
      newReceive.set(buf.subarray(0, n), receive.length);
      receive = newReceive;

      // 检查是否以 \n 结尾（消息结束标志）
      if (receive.length >= 1 && receive[receive.length - 1] === 0x0a) {
        break;
      }
    }

    clearTimeout(timeoutId);

    const data = decoder.decode(receive);
    return createSuccessResult(data);
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return createFailResult(BSERR_RECVSOCK_TIMEOUT, "网络接收超时");
    }
    return createFailResult(
      BSERR_RECVSOCK_FAIL,
      `网络接收错误: ${error.message}`,
    );
  }
}

/**
 * 发送消息并接收响应（组合操作，类似 Python 的 send_msg）
 * @param {Deno.TcpConn} socket - TCP 连接
 * @param {string} message - 要发送的消息
 * @returns {Promise<ResultData>} 包含接收到的完整响应字符串
 */
export async function sendAndReceive(socket, message) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(message + DELIMITER);

    const sendController = new AbortController();
    const sendTimeoutId = setTimeout(() => sendController.abort(), SEND_TIMEOUT);

    await socket.write(data);
    clearTimeout(sendTimeoutId);

    // 接收响应
    const recvController = new AbortController();
    const recvTimeoutId = setTimeout(() => recvController.abort(), RECV_TIMEOUT);

    const decoder = new TextDecoder();
    let receive = new Uint8Array(0);
    const buf = new Uint8Array(8192);

    while (true) {
      const n = await socket.read(buf);

      if (n === null) {
        clearTimeout(recvTimeoutId);
        if (receive.length > 0) {
          const rawData = decoder.decode(receive);
          return createSuccessResult(rawData);
        }
        return createFailResult(
          BSERR_RECVCONNECTION_CLOSED,
          "网络接收时连接断开",
        );
      }

      const newReceive = new Uint8Array(receive.length + n);
      newReceive.set(receive);
      newReceive.set(buf.subarray(0, n), receive.length);
      receive = newReceive;

      // 检查是否以 \n 结尾（消息结束标志）
      if (receive.length >= 1 && receive[receive.length - 1] === 0x0a) {
        break;
      }
    }

    clearTimeout(recvTimeoutId);

    // 检查是否需要解压
    // 解析消息头获取消息类型
    const headerStr = decoder.decode(receive.subarray(0, MESSAGE_HEADER_LENGTH));
    const headerArr = headerStr.split(MESSAGE_SPLIT);
    const msgType = headerArr[1];

    if (COMPRESSED_MESSAGE_TYPE_SET.has(msgType)) {
      // 需要解压：消息体使用 zlib 压缩
      const bodyLength = parseInt(headerArr[2], 10);
      const compressedBody = receive.subarray(
        MESSAGE_HEADER_LENGTH,
        MESSAGE_HEADER_LENGTH + bodyLength,
      );

      try {
        // 使用 pako 或 Deno 内置的 zlib 解压
        // Deno 支持使用 Web API 的 CompressionStream
        const decompressed = await decompressZlib(compressedBody);
        const bodyStr = decoder.decode(decompressed);
        // 返回 header + 解压后的 body
        return createSuccessResult(headerStr + bodyStr);
      } catch (e) {
        return createFailResult(
          BSERR_UNGZIP_DATA_FAIL,
          `gzip 解压失败: ${e.message}`,
        );
      }
    }

    const rawData = decoder.decode(receive);
    return createSuccessResult(rawData);
  } catch (error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return createFailResult(BSERR_SENDSOCK_TIMEOUT, "网络发送超时");
    }
    return createFailResult(
      BSERR_SENDSOCK_FAIL,
      `网络发送接收失败: ${error.message}`,
    );
  }
}

/**
 * 关闭连接
 * @param {Deno.TcpConn} socket - TCP 连接
 */
export function closeConnection(socket) {
  try {
    if (socket) {
      socket.close();
    }
  } catch (_e) {
    // ignore close errors
  }
}
