/**
 * 结果集
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import {
  BSERR_SUCCESS,
  BAOSTOCK_CLIENT_VERSION,
  BAOSTOCK_PER_PAGE_COUNT,
  MESSAGE_SPLIT,
  MESSAGE_HEADER_LENGTH,
  COMPRESSED_MESSAGE_TYPE_TUPLE,
} from "../common/contants.js";
import { toMessageHeader } from "./messageheader.js";
import { sendAndReceive } from "../util/socketutil.js";
import context from "../common/context.js";

/**
 * ResultData 类，用于封装返回结果
 */
export class ResultData {
  constructor() {
    // 消息头
    this.version = BAOSTOCK_CLIENT_VERSION;
    this.msgType = 0;
    this.msgBodyLength = 0;

    // 消息体
    this.method = "";
    this.userId = "";
    this.errorCode = "10001001"; // BSERR_NO_LOGIN
    this.errorMsg = "";

    this.curPageNum = 1;
    this.perPageCount = BAOSTOCK_PER_PAGE_COUNT;
    this.curRowNum = 0;

    this.code = "";
    this.codeName = "";
    this.fields = [];
    this.startDate = "";
    this.endDate = "";
    this.frequency = "";
    this.adjustflag = "";
    this.data = [];

    this.msgBody = "";
    this.year = "";
    this.yearType = "";
    this.quarter = "";
    this.day = "";
    this.date = "";
  }

  /**
   * 判断是否成功
   * @returns {boolean}
   */
  isSuccess() {
    return this.errorCode === BSERR_SUCCESS;
  }

  /**
   * 判断是否失败
   * @returns {boolean}
   */
  isFailed() {
    return this.errorCode !== BSERR_SUCCESS;
  }

  /**
   * 判断是否还有后续数据
   * @returns {boolean}
   */
  async next() {
    if (this.data.length === 0) {
      return false;
    }

    if (this.curRowNum < this.data.length) {
      return true;
    }

    // 当前页获取的总记录数不足 BAOSTOCK_PER_PAGE_COUNT 时，不请求下一页
    if (this.data.length < BAOSTOCK_PER_PAGE_COUNT) {
      return false;
    }

    // 请求下一页数据
    const msgBodySplit = this.msgBody.split(MESSAGE_SPLIT);
    const nextPage = parseInt(this.curPageNum, 10) + 1;
    msgBodySplit[2] = String(nextPage);

    const newMsgBody = msgBodySplit.join(MESSAGE_SPLIT);
    const msgHeader = toMessageHeader(this.msgType, newMsgBody.length);
    const headBody = msgHeader + newMsgBody;

    // 计算 CRC32
    const encoder = new TextEncoder();
    const headBodyBytes = encoder.encode(headBody);
    const crc32Value = crc32(headBodyBytes);

    const sendMsg = `${headBody}${MESSAGE_SPLIT}${crc32Value}`;

    const recvResult = await sendAndReceive(context.default_socket, sendMsg);
    if (recvResult.isFailed() || !recvResult.data || recvResult.data.trim() === "") {
      return false;
    }

    const receiveData = recvResult.data;
    const respMsgHeader = receiveData.substring(0, MESSAGE_HEADER_LENGTH);
    const respMsgBody = receiveData.substring(MESSAGE_HEADER_LENGTH, receiveData.length - 1);

    const headerArr = respMsgHeader.split(MESSAGE_SPLIT);
    const bodyArr = respMsgBody.split(MESSAGE_SPLIT);

    this.msgBodyLength = headerArr[2];
    this.errorCode = bodyArr[0];
    this.errorMsg = bodyArr[1];

    if (this.errorCode === BSERR_SUCCESS) {
      this.method = bodyArr[2];
      this.userId = bodyArr[3];
      this.curPageNum = bodyArr[4];
      this.perPageCount = bodyArr[5];
      this.setData(bodyArr[6]);
      this.curRowNum = 0;
      return this.data.length > 0;
    }

    return false;
  }

  /**
   * 返回当前获取的结果的某一行
   * @returns {string[]}
   */
  getRowData() {
    const returnData = [];
    if (this.curRowNum < this.data.length) {
      returnData.push(...this.data[this.curRowNum]);
      this.curRowNum++;
    }
    return returnData;
  }

  /**
   * 返回当前获取的全部结果
   * @returns {Array<Object>}
   */
  getData() {
    if (this.data.length === 0) {
      return [];
    }

    const result = this.data.map((row) => {
      const obj = {};
      this.fields.forEach((field, index) => {
        obj[field] = row[index];
      });
      return obj;
    });

    this.curRowNum = this.data.length;
    return result;
  }

  /**
   * 对返回数据进行处理，将 string 转为 list 类型
   * @param {string} receiveData - JSON 字符串
   */
  setData(receiveData) {
    if (receiveData && receiveData.trim() !== "") {
      const receiveArray = receiveData.split(/\s+/);
      const jsData = JSON.parse(receiveArray.join(""));
      this.data = jsData.record || [];
    } else {
      this.data = [];
    }
  }

  /**
   * 对返回数据的指标参数进行处理，将 string 中的空格去除
   * @param {string} receiveFields - 字段字符串
   */
  setFields(receiveFields) {
    const fieldArr = receiveFields.split(",");
    this.fields = fieldArr.map((f) => f.trim());
  }
}

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
 * 创建成功结果
 * @param {*} data - 返回数据
 * @returns {ResultData}
 */
export function createSuccessResult(data) {
  const result = new ResultData();
  result.errorCode = BSERR_SUCCESS;
  result.errorMsg = "success";
  result.data = data;
  return result;
}

/**
 * 创建失败结果
 * @param {string} errorCode - 错误代码
 * @param {string} errorMsg - 错误信息
 * @returns {ResultData}
 */
export function createFailResult(errorCode, errorMsg) {
  const result = new ResultData();
  result.errorCode = errorCode;
  result.errorMsg = errorMsg;
  result.data = null;
  return result;
}
