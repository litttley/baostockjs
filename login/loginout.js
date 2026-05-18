/**
 * 登录/登出模块
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  BAOSTOCK_CLIENT_VERSION,
  MESSAGE_TYPE_LOGIN_REQUEST,
  MESSAGE_TYPE_LOGIN_RESPONSE,
  MESSAGE_TYPE_LOGOUT_REQUEST,
  MESSAGE_TYPE_LOGOUT_RESPONSE,
  BSERR_SUCCESS,
  BSERR_USERNAME_EMPTY,
  BSERR_PASSWORD_EMPTY,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
} from "../common/contants.js";
import context from "../common/context.js";
import { toMessageHeader } from "../data/messageheader.js";
import { createSuccessResult, createFailResult } from "../data/resultset.js";
import {
  createConnection,
  sendMessage,
  receiveMessage,
  closeConnection,
} from "../util/socketutil.js";

/**
 * CRC32 计算
 * @param {Uint8Array} data
 * @returns {number}
 */
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * 获取当前时间字符串 YYYYMMDDHHMMSS
 * @returns {string}
 */
function getNowTimeStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * 登录
 * @param {string} [username="anonymous"] - 用户名
 * @param {string} [password="123456"] - 密码
 * @returns {Promise<ResultData>}
 */
export async function login(username = "anonymous", password = "123456") {
  // 参数校验
  if (!username || username.trim() === "") {
    return createFailResult(BSERR_USERNAME_EMPTY, "用户ID不能为空。");
  }
  if (!password || password.trim() === "") {
    return createFailResult(BSERR_PASSWORD_EMPTY, "密码不能为空。");
  }

  // 建立连接
  const { result: connResult, socket } = await createConnection();
  if (connResult.isFailed()) {
    return connResult;
  }

  // 构建登录消息体: login,user_id,password,options
  const options = "0";
  const msgBody = `login${MESSAGE_SPLIT}${username}${MESSAGE_SPLIT}${password}${MESSAGE_SPLIT}${options}`;
  const msgHeader = toMessageHeader(MESSAGE_TYPE_LOGIN_REQUEST, msgBody.length);
  const headBody = msgHeader + msgBody;

  // 计算 CRC32
  const encoder = new TextEncoder();
  const headBodyBytes = encoder.encode(headBody);
  const crc32Value = crc32(headBodyBytes);

  // 完整消息: headBody + MESSAGE_SPLIT + crc32
  const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

  // 发送登录请求
  const sendResult = await sendMessage(socket, sendMsg);
  if (sendResult.isFailed()) {
    closeConnection(socket);
    return sendResult;
  }

  // 接收登录响应
  const recvResult = await receiveMessage(socket);
  if (recvResult.isFailed()) {
    closeConnection(socket);
    return recvResult;
  }

  const receiveData = recvResult.data;
  if (!receiveData || receiveData.trim() === "") {
    closeConnection(socket);
    return createFailResult(BSERR_RECVSOCK_FAIL, "网络接收错误。");
  }

  // 解析响应: 前 MESSAGE_HEADER_LENGTH 字节是消息头，后面是消息体（去掉最后一个 \n）
  const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
  const respMsgBody = receiveData.substring(MESSAGE_HEADER_LENGTH, receiveData.length - 1);

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  const errorCode = bodyArr[0];
  const errorMsg = bodyArr[1];

  if (errorCode !== BSERR_SUCCESS) {
    closeConnection(socket);
    return createFailResult(errorCode, errorMsg);
  }

  // 保存全局上下文
  context.user_id = bodyArr[3];
  context.default_socket = socket;

  return createSuccessResult({
    errorCode: errorCode,
    errorMsg: errorMsg,
    method: bodyArr[2],
    userId: bodyArr[3],
  });
}

/**
 * 登出
 * @returns {Promise<ResultData>}
 */
export async function logout() {
  if (!context.default_socket) {
    return createFailResult(BSERR_NO_LOGIN, "用户未登陆");
  }

  const nowTime = getNowTimeStr();

  // 构建登出消息体: logout,user_id,now_time
  const msgBody = `logout${MESSAGE_SPLIT}${context.user_id}${MESSAGE_SPLIT}${nowTime}`;
  const msgHeader = toMessageHeader(MESSAGE_TYPE_LOGOUT_REQUEST, msgBody.length);
  const headBody = msgHeader + msgBody;

  // 计算 CRC32
  const encoder = new TextEncoder();
  const headBodyBytes = encoder.encode(headBody);
  const crc32Value = crc32(headBodyBytes);

  // 完整消息: headBody + MESSAGE_SPLIT + crc32
  const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

  // 发送登出请求
  const sendResult = await sendMessage(context.default_socket, sendMsg);
  if (sendResult.isFailed()) {
    closeConnection(context.default_socket);
    context.user_id = null;
    context.default_socket = null;
    return sendResult;
  }

  // 接收登出响应
  const recvResult = await receiveMessage(context.default_socket);
  if (recvResult.isFailed()) {
    closeConnection(context.default_socket);
    context.user_id = null;
    context.default_socket = null;
    return recvResult;
  }

  const receiveData = recvResult.data;
  if (!receiveData || receiveData.trim() === "") {
    closeConnection(context.default_socket);
    context.user_id = null;
    context.default_socket = null;
    return createFailResult(BSERR_RECVSOCK_FAIL, "网络接收错误。");
  }

  // 解析响应
  const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
  const respMsgBody = receiveData.substring(MESSAGE_HEADER_LENGTH, receiveData.length - 1);

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  const errorCode = bodyArr[0];
  const errorMsg = bodyArr[1];

  // 关闭连接
  closeConnection(context.default_socket);
  context.user_id = null;
  context.default_socket = null;

  if (errorCode !== BSERR_SUCCESS) {
    return createFailResult(errorCode, errorMsg);
  }

  return createSuccessResult({
    errorCode: errorCode,
    errorMsg: errorMsg,
    method: bodyArr[2],
    userId: bodyArr[3],
  });
}
