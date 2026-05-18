/**
 * 消息解析
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import { MESSAGE_SPLIT, MESSAGE_HEADER_LENGTH } from "../common/contants.js";

/**
 * 解析接收到的消息
 * @param {string} recvMsg - 接收到的原始消息字符串
 * @returns {{msgHeader: string, msgBody: string}|null}
 */
export function parseMsg(recvMsg) {
  if (!recvMsg || recvMsg.length < MESSAGE_HEADER_LENGTH) {
    return null;
  }

  const msgHeader = recvMsg.substring(0, MESSAGE_HEADER_LENGTH);
  const msgBody = recvMsg.substring(MESSAGE_HEADER_LENGTH);

  return { msgHeader, msgBody };
}

/**
 * 解析消息头
 * @param {string} msgHeader - 消息头字符串
 * @returns {{version: string, msgType: string, bodyLength: number}}
 */
export function parseMsgHeader(msgHeader) {
  const parts = msgHeader.split(MESSAGE_SPLIT);
  return {
    version: parts[0] || "",
    msgType: parts[1] || "",
    bodyLength: parseInt(parts[2] || "0", 10),
  };
}

/**
 * 解析消息体（登录/登出响应格式：errorCode,errorMsg,userId）
 * @param {string} msgBody - 消息体字符串
 * @returns {{errorCode: string, errorMsg: string, userId: string|null}}
 */
export function parseLoginResponseBody(msgBody) {
  if (!msgBody) {
    return { errorCode: "", errorMsg: "", userId: null };
  }

  const parts = msgBody.split(MESSAGE_SPLIT);
  return {
    errorCode: parts[0] || "",
    errorMsg: parts[1] || "",
    userId: parts[2] || null,
  };
}
