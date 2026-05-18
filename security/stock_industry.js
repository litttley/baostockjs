/**
 * 获取行业类别
 * 对应 baostock Python 库的 query_stock_industry()
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_TYPE_QUERYSTOCKINDUSTRY_REQUEST,
  BAOSTOCK_PER_PAGE_COUNT,
  BSERR_SUCCESS,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
  BSERR_DATE_ERR,
  BSERR_PARAM_ERR,
  STOCK_CODE_LENGTH,
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
 * 获取行业类别
 * 通过输入股票代码、日期，可以查询股票所属行业（申万行业分类）。
 * 行业分类标准：2014版申万行业分类
 * 
 * @param {string} code - 证券代码，格式如 "sh.600000"，可选
 * @param {string} date - 日期，格式 "YYYY-MM-DD"，可选
 * @returns {Promise<ResultData>}
 * 
 * 返回字段说明：
 *   code: 证券代码
 *   code_name: 证券名称
 *   industry: 所属行业
 *   industryClassification: 行业分类（如 "SW" 申万）
 *   date: 更新日期
 */
export async function queryStockIndustry(code = "", date = "") {
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

  // 构建消息体: query_stock_industry,userId,1,BAOSTOCK_PER_PAGE_COUNT,code,date
  const param = `query_stock_industry,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${code},${date}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYSTOCKINDUSTRY_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYSTOCKINDUSTRY_REQUEST;
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
    data.date = bodyArr[8] || "";
    data.setFields(bodyArr[9] || "");
  }

  return data;
}
