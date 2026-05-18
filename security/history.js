/**
 * 获取历史行情
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  BAOSTOCK_PER_PAGE_COUNT,
  STOCK_CODE_LENGTH,
  DEFAULT_START_DATE,
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_TYPE_GETKDATAPLUS_REQUEST,
  BSERR_SUCCESS,
  BSERR_PARAM_ERR,
  BSERR_START_BIGTHAN_END,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
} from "../common/contants.js";
import context from "../common/context.js";
import { toMessageHeader } from "../data/messageheader.js";
import { ResultData } from "../data/resultset.js";
import { sendAndReceive } from "../util/socketutil.js";
import { isValidDate } from "../util/stringutil.js";

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
 * 获取当前日期字符串 YYYY-MM-DD
 * @returns {string}
 */
function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 获取历史K线数据（Plus版本，支持压缩）
 * @param {string} code - 证券代码，格式如 "sh.600000"
 * @param {string} fields - 指标，如 "date,open,high,low,close,volume,amount"
 * @param {string} [start_date] - 开始日期，格式 "YYYY-MM-DD"，默认 "2015-01-01"
 * @param {string} [end_date] - 结束日期，格式 "YYYY-MM-DD"，默认当天
 * @param {string} [frequency='d'] - 数据类型，'d'日k线、'w'周、'm'月、'5'5分钟、'15'15分钟、'30'30分钟、'60'60分钟
 * @param {string} [adjustflag='3'] - 复权类型，'1'后复权、'2'前复权、'3'不复权
 * @returns {Promise<ResultData>}
 */
export async function queryHistoryKDataPlus(
  code,
  fields,
  start_date = null,
  end_date = null,
  frequency = "d",
  adjustflag = "3",
) {
  const data = new ResultData();

  // 参数校验
  if (!code || code.trim() === "") {
    data.errorCode = BSERR_PARAM_ERR;
    data.errorMsg = "股票代码不能为空，请检查。";
    console.error("股票代码不能为空，请检查。");
    return data;
  }

  if (code.length !== STOCK_CODE_LENGTH) {
    data.errorCode = BSERR_PARAM_ERR;
    data.errorMsg =
      `股票代码应为${STOCK_CODE_LENGTH}位，请检查。格式示例：sh.600000。`;
    console.error(
      `股票代码应为${STOCK_CODE_LENGTH}位，请检查。格式示例：sh.600000。`,
    );
    return data;
  }

  // 统一转为小写
  code = code.toLowerCase();

  // 如果代码以 sh/sz 结尾（如 600000.sh），转换为标准格式 sh.600000
  if (code.endsWith("sh") || code.endsWith("sz")) {
    code = code.substring(7, 9).toLowerCase() + "." + code.substring(0, 6);
  }

  if (!fields || fields.trim() === "") {
    data.errorCode = BSERR_PARAM_ERR;
    data.errorMsg = "指示简称不能为空，请检查。";
    console.error("指示简称不能为空，请检查。");
    return data;
  }

  // 日期处理
  if (!start_date || start_date.trim() === "") {
    start_date = DEFAULT_START_DATE;
  }
  if (!end_date || end_date.trim() === "") {
    end_date = getTodayStr();
  }

  if (start_date && end_date) {
    if (isValidDate(start_date) && isValidDate(end_date)) {
      const startDateTime = new Date(start_date);
      const endDateTime = new Date(end_date);
      if (endDateTime < startDateTime) {
        data.errorCode = BSERR_START_BIGTHAN_END;
        data.errorMsg = "起始日期大于终止日期，请修改。";
        console.error("起始日期大于终止日期，请修改。");
        return data;
      }
    } else {
      data.errorCode = BSERR_PARAM_ERR;
      data.errorMsg = "日期格式不正确，请修改。";
      console.error("日期格式不正确，请修改。");
      return data;
    }
  }

  if (!frequency || frequency.trim() === "") {
    data.errorCode = BSERR_PARAM_ERR;
    data.errorMsg = "数据类型（frequency）不可为空，请检查。";
    console.error("数据类型（frequency）不可为空，请检查。");
    return data;
  }

  if (!adjustflag || adjustflag.trim() === "") {
    data.errorCode = BSERR_PARAM_ERR;
    data.errorMsg = "复权类型（adjustflag）不可为空，请检查。";
    console.error("复权类型（adjustflag）不可为空，请检查。");
    return data;
  }

  // 检查登录状态
  const userId = context.user_id;
  const sock = context.default_socket;
  if (!userId || !sock) {
    data.errorCode = BSERR_NO_LOGIN;
    data.errorMsg = "you don't login.";
    console.error("you don't login.");
    return data;
  }

  // 构建消息体
  const msgBody =
    "query_history_k_data_plus" +
    MESSAGE_SPLIT + userId +
    MESSAGE_SPLIT + "1" + // cur_page_num
    MESSAGE_SPLIT + String(BAOSTOCK_PER_PAGE_COUNT) +
    MESSAGE_SPLIT + code +
    MESSAGE_SPLIT + fields +
    MESSAGE_SPLIT + start_date +
    MESSAGE_SPLIT + end_date +
    MESSAGE_SPLIT + frequency +
    MESSAGE_SPLIT + adjustflag;

  const msgHeader = toMessageHeader(MESSAGE_TYPE_GETKDATAPLUS_REQUEST, msgBody.length);

  data.msgType = MESSAGE_TYPE_GETKDATAPLUS_REQUEST;
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
  const respMsgBody = receiveData.substring(MESSAGE_HEADER_LENGTH, receiveData.length - 1);

  const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
  const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

  console.log("DEBUG bodyArr length:", bodyArr.length);
  console.log("DEBUG bodyArr:", JSON.stringify(bodyArr));

  data.msgBodyLength = headerArr[2];
  data.errorCode = bodyArr[0];
  data.errorMsg = bodyArr[1];

  if (data.errorCode === BSERR_SUCCESS) {
    data.method = bodyArr[2];
    data.userId = bodyArr[3];
    data.curPageNum = bodyArr[4];
    data.perPageCount = bodyArr[5];
    data.setData(bodyArr[6]);
    data.code = bodyArr[7];
    data.setFields(bodyArr[8]);
    data.startDate = bodyArr[9];
    data.endDate = bodyArr[10];
    data.frequency = bodyArr[11];
    data.adjustflag = bodyArr[12] || "";
  }

  return data;
}
