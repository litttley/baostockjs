/**
 * 获取季频公司业绩快报
 * 对应 baostock Python 库的 query_performance_express_report()
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  MESSAGE_TYPE_QUERYPERFORMANCEEXPRESSREPORT_REQUEST,
  BAOSTOCK_PER_PAGE_COUNT,
  BSERR_SUCCESS,
  BSERR_NO_LOGIN,
  BSERR_RECVSOCK_FAIL,
  BSERR_PARAM_ERR,
  BSERR_DATE_ERR,
  BSERR_START_BIGTHAN_END,
  STOCK_CODE_LENGTH,
  DEFAULT_START_DATE,
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
 * 获取当前日期字符串 YYYY-MM-DD
 * @returns {string}
 */
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 获取季频公司业绩快报
 * 通过输入股票代码、起始日期、截止日期，可以查询公司业绩快报信息。
 * 
 * @param {string} code - 证券代码，格式如 "sh.600000"，必填
 * @param {string} startDate - 起始日期，格式 "YYYY-MM-DD"，可选，默认 "2015-01-01"
 * @param {string} endDate - 截止日期，格式 "YYYY-MM-DD"，可选，默认当前日期
 * @returns {Promise<ResultData>}
 * 
 * 返回字段说明：
 *   code: 证券代码
 *   code_name: 证券名称
 *   year: 统计年份
 *   quarter: 统计季度
 *   performanceExpressReportDate: 业绩快报公告日期
 *   performanceExpressReportTotalShare: 业绩快报总股本
 *   performanceExpressReportNetProfit: 业绩快报净利润
 *   performanceExpressReportYstz: 业绩快报净利润同比增长
 *   performanceExpressReportBps: 业绩快报每股净资产
 *   performanceExpressReportWeightavgroe: 业绩快报净资产收益率
 *   performanceExpressReportOperationCashFlow: 业绩快报每股经营现金流量
 *   performanceExpressReportYysr: 业绩快报营业收入
 *   performanceExpressReportYysrtz: 业绩快报营业收入同比增长
 */
export async function queryPerformanceExpressReport(code, startDate, endDate) {
  const data = new ResultData();

  // 代码校验 - code 为必填
  if (!code || code === "") {
    console.error("股票代码不能为空，请检查。");
    data.errorMsg = "股票代码不能为空，请检查。";
    data.errorCode = BSERR_PARAM_ERR;
    return data;
  }
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

  // 日期参数处理
  if (!startDate || startDate === "") {
    startDate = DEFAULT_START_DATE;
  }
  if (!endDate || endDate === "") {
    endDate = getTodayStr();
  }

  // 日期格式校验
  if (startDate && endDate) {
    if (!isValidDate(startDate)) {
      console.error("起始日期格式不正确，请修改。");
      data.errorCode = BSERR_DATE_ERR;
      data.errorMsg = "起始日期格式不正确，请修改。";
      return data;
    }
    if (!isValidDate(endDate)) {
      console.error("截止日期格式不正确，请修改。");
      data.errorCode = BSERR_DATE_ERR;
      data.errorMsg = "截止日期格式不正确，请修改。";
      return data;
    }
    if (endDate < startDate) {
      console.error("起始日期大于终止日期，请修改。");
      data.errorCode = BSERR_START_BIGTHAN_END;
      data.errorMsg = "起始日期大于终止日期，请修改。";
      return data;
    }
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

  // 构建消息体: query_performance_express_report,userId,1,BAOSTOCK_PER_PAGE_COUNT,code,startDate,endDate
  const param = `query_performance_express_report,${userId},1,${BAOSTOCK_PER_PAGE_COUNT},${code},${startDate},${endDate}`;
  const msgBody = organizeMsgBody(param);
  const msgHeader = toMessageHeader(
    MESSAGE_TYPE_QUERYPERFORMANCEEXPRESSREPORT_REQUEST,
    msgBody.length,
  );

  data.msgType = MESSAGE_TYPE_QUERYPERFORMANCEEXPRESSREPORT_REQUEST;
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
    data.startDate = bodyArr[8] || "";
    data.endDate = bodyArr[9] || "";
    data.setFields(bodyArr[10] || "");
  }

  return data;
}
