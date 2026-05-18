/**
 * 获取证券基本资料
 * 对应 baostock Python 库的 query_stock_basic()
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_TYPE_QUERYSTOCKBASIC_REQUEST,
  BAOSTOCK_PER_PAGE_COUNT,
  BSERR_SUCCESS,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
  BSERR_PARAM_ERR,
  STOCK_CODE_LENGTH,
} from "../common/contants.js";
import context from "../common/context.js";
import { toMessageHeader } from "../data/messageheader.js";
import { ResultData } from "../data/resultset.js";
import { sendAndReceive } from "../util/socketutil.js";
import { organizeMsgBody } from "../util/stringutil.js";

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
 * 获取证券基本资料
 * 通过输入股票代码、股票名称，可以查询股票的基本信息。
 * 
 * @param {string} code - 证券代码，格式如 "sh.600000"，可选
 * @param {string} codeName - 证券名称，可选，支持模糊查询
 * @returns {Promise<ResultData>}
 * 
 * 返回字段说明：
 *   code: 证券代码
 *   code_name: 证券名称
 *   ipoDate: 上市日期
 *   outDate: 退市日期
 *   type: 证券类型（1：股票，2：指数，3：其它）
 *   status: 上市状态（1：上市，0：退市）
 */
export async function queryStockBasic(code = "", codeName = "") {
  const data = new ResultData();

  // 代码校验
  if (code && code !== "") {
    if (code.length !== STOCK_CODE_LENGTH) {
      console.error("股票代码应为" + STOCK_CODE_LENGTH + "位，请检查。格式示例：sh.600000。");
      data.errorMsg = "股票代码应为" + STOCK_CODE_LENGTH + "位，请检查。格式示例：sh.600000。";
      data.errorCode = BSERR_PARAM_ERR;
      return data;
    }
    code = code.toLowerCase();
    if (code.endsWith("sh") || code.endsWith("sz")) {
      code = code.substring(7, 9).toLowerCase() + "." + code.substring(0, 6);
    }
  } else {
    code = "";
  }

  if (!codeName || codeName === "") {
    codeName = "";
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

  // 构建消息体: query_stock_basic,userId,1,BAOSTOCK_PER_PAGE_COUNT,code,codeName
  const param = `query_stock_basic,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${code},${codeName}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYSTOCKBASIC_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYSTOCKBASIC_REQUEST;
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
    data.code = bodyArr[7] || "";
    data.codeName = bodyArr[8] || "";
    data.setFields(bodyArr[9] || "");
  }

  return data;
}
