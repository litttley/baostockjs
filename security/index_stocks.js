/**
 * 获取指数成分股（上证50、沪深300、中证500）
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_TYPE_QUERYSZ50STOCKS_REQUEST,
  MESSAGE_TYPE_QUERYHS300STOCKS_REQUEST,
  MESSAGE_TYPE_QUERYZZ500STOCKS_REQUEST,
  BAOSTOCK_PER_PAGE_COUNT,
  BSERR_SUCCESS,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
  BSERR_DATE_ERR,
} from "../common/contants.js";
import context from "../common/context.js";
import { toMessageHeader } from "../data/messageheader.js";
import { ResultData } from "../data/resultset.js";
import { sendAndReceive } from "../util/socketutil.js";
import { organizeMsgBody, isValidDate } from "../util/stringutil.js";

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
 * 获取上证50成分股
 * @param {string} [date] - 日期，格式 "YYYY-MM-DD"，可选
 * @returns {Promise<ResultData>}
 */
export async function querySZ50Stocks(date = "") {
  const data = new ResultData();

  // 日期参数校验
  if (date && date !== "") {
    if (!isValidDate(date)) {
      console.error("日期格式不正确，请修改。");
      data.errorCode = BSERR_DATE_ERR;
      data.errorMsg = "日期格式不正确，请修改。";
      return data;
    }
  } else {
    date = "";
  }

  // 检查登录状态
  let userId;
  try {
    userId = context.user_id;
  } catch (e) {
    console.error("you don't login.");
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    return data;
  }

  const sock = context.default_socket;
  if (!userId || !sock) {
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    console.error("you don't login.");
    return data;
  }

  // 构建消息体: query_sz50_stocks,userId,1,BAOSTOCK_PER_PAGE_COUNT,date
  const param = `query_sz50_stocks,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${date}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYSZ50STOCKS_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYSZ50STOCKS_REQUEST;
  data.msgBody = msgBody;

  const headBody = msgHeader + msgBody;

  // 计算 CRC32
  const encoder = new TextEncoder();
  const headBodyBytes = encoder.encode(headBody);
  const crc32Value = crc32(headBodyBytes);

  const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

  // 发送并接收
  const recvResult = await sendAndReceive(context.default_socket, sendMsg);
  if (recvResult.isFailed() || !recvResult.data || recvResult.data.trim() === "") {
    data.errorCode = BSERR_RECVSOCK_FAIL;
    data.errorMsg = "网络接收错误。";
    return data;
  }

  const receiveData = recvResult.data;
  const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
  const respMsgBody = receiveData.substring(
    MESSAGE_HEADER_LENGTH,
    receiveData.length - 1,
  );

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  data.msgBodyLength = headerArr[2];
  data.errorCode = bodyArr[0];
  data.errorMsg = bodyArr[1];

  if (data.errorCode === BSERR_SUCCESS) {
    data.method = bodyArr[2];
    data.userId = bodyArr[3];
    data.curPageNum = bodyArr[4];
    data.perPageCount = bodyArr[5];
    data.setData(bodyArr[6]);
    data.date = bodyArr[7] || "";
    data.setFields(bodyArr[8] || "");
  }

  return data;
}

/**
 * 获取沪深300成分股
 * @param {string} [date] - 日期，格式 "YYYY-MM-DD"，可选
 * @returns {Promise<ResultData>}
 */
export async function queryHS300Stocks(date = "") {
  const data = new ResultData();

  // 日期参数校验
  if (date && date !== "") {
    if (!isValidDate(date)) {
      console.error("日期格式不正确，请修改。");
      data.errorCode = BSERR_DATE_ERR;
      data.errorMsg = "日期格式不正确，请修改。";
      return data;
    }
  } else {
    date = "";
  }

  // 检查登录状态
  let userId;
  try {
    userId = context.user_id;
  } catch (e) {
    console.error("you don't login.");
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    return data;
  }

  const sock = context.default_socket;
  if (!userId || !sock) {
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    console.error("you don't login.");
    return data;
  }

  // 构建消息体: query_hs300_stocks,userId,1,BAOSTOCK_PER_PAGE_COUNT,date
  const param = `query_hs300_stocks,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${date}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYHS300STOCKS_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYHS300STOCKS_REQUEST;
  data.msgBody = msgBody;

  const headBody = msgHeader + msgBody;

  // 计算 CRC32
  const encoder = new TextEncoder();
  const headBodyBytes = encoder.encode(headBody);
  const crc32Value = crc32(headBodyBytes);

  const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

  // 发送并接收
  const recvResult = await sendAndReceive(context.default_socket, sendMsg);
  if (recvResult.isFailed() || !recvResult.data || recvResult.data.trim() === "") {
    data.errorCode = BSERR_RECVSOCK_FAIL;
    data.errorMsg = "网络接收错误。";
    return data;
  }

  const receiveData = recvResult.data;
  const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
  const respMsgBody = receiveData.substring(
    MESSAGE_HEADER_LENGTH,
    receiveData.length - 1,
  );

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  data.msgBodyLength = headerArr[2];
  data.errorCode = bodyArr[0];
  data.errorMsg = bodyArr[1];

  if (data.errorCode === BSERR_SUCCESS) {
    data.method = bodyArr[2];
    data.userId = bodyArr[3];
    data.curPageNum = bodyArr[4];
    data.perPageCount = bodyArr[5];
    data.setData(bodyArr[6]);
    data.date = bodyArr[7] || "";
    data.setFields(bodyArr[8] || "");
  }

  return data;
}

/**
 * 获取中证500成分股
 * @param {string} [date] - 日期，格式 "YYYY-MM-DD"，可选
 * @returns {Promise<ResultData>}
 */
export async function queryZZ500Stocks(date = "") {
  const data = new ResultData();

  // 日期参数校验
  if (date && date !== "") {
    if (!isValidDate(date)) {
      console.error("日期格式不正确，请修改。");
      data.errorCode = BSERR_DATE_ERR;
      data.errorMsg = "日期格式不正确，请修改。";
      return data;
    }
  } else {
    date = "";
  }

  // 检查登录状态
  let userId;
  try {
    userId = context.user_id;
  } catch (e) {
    console.error("you don't login.");
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    return data;
  }

  const sock = context.default_socket;
  if (!userId || !sock) {
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    console.error("you don't login.");
    return data;
  }

  // 构建消息体: query_zz500_stocks,userId,1,BAOSTOCK_PER_PAGE_COUNT,date
  const param = `query_zz500_stocks,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${date}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYZZ500STOCKS_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYZZ500STOCKS_REQUEST;
  data.msgBody = msgBody;

  const headBody = msgHeader + msgBody;

  // 计算 CRC32
  const encoder = new TextEncoder();
  const headBodyBytes = encoder.encode(headBody);
  const crc32Value = crc32(headBodyBytes);

  const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

  // 发送并接收
  const recvResult = await sendAndReceive(context.default_socket, sendMsg);
  if (recvResult.isFailed() || !recvResult.data || recvResult.data.trim() === "") {
    data.errorCode = BSERR_RECVSOCK_FAIL;
    data.errorMsg = "网络接收错误。";
    return data;
  }

  const receiveData = recvResult.data;
  const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
  const respMsgBody = receiveData.substring(
    MESSAGE_HEADER_LENGTH,
    receiveData.length - 1,
  );

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  data.msgBodyLength = headerArr[2];
  data.errorCode = bodyArr[0];
  data.errorMsg = bodyArr[1];

  if (data.errorCode === BSERR_SUCCESS) {
    data.method = bodyArr[2];
    data.userId = bodyArr[3];
    data.curPageNum = bodyArr[4];
    data.perPageCount = bodyArr[5];
    data.setData(bodyArr[6]);
    data.date = bodyArr[7] || "";
    data.setFields(bodyArr[8] || "");
  }

  return data;
}
