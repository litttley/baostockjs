/**
 * 字符串工具类
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import { MESSAGE_SPLIT } from "../common/contants.js";

/**
 * 在字符串的左或右添加0
 * @param {string|number} content - 待修改的字符串
 * @param {number} length - 总共的长度
 * @param {boolean} direction - 方向，true左，false右
 * @returns {string}
 */
export function addZeroForString(content, length, direction) {
  content = String(content);
  let strLen = content.length;
  while (strLen < length) {
    if (direction) {
      content = "0" + content;
    } else {
      content = content + "0";
    }
    strLen = content.length;
  }
  return content;
}

/**
 * 判断是否是一个有效的日期字符串 (yyyy-mm-dd)
 * @param {string} str
 * @returns {boolean}
 */
export function isValidDate(str) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

/**
 * 判断是否是一个有效的年日期字符串 (yyyy)
 * @param {string} str
 * @returns {boolean}
 */
export function isValidYearDate(str) {
  const regex = /^\d{4}$/;
  return regex.test(str);
}

/**
 * 判断是否是一个有效的年月日期字符串 (yyyy-mm)
 * @param {string} str
 * @returns {boolean}
 */
export function isValidYearMonthDate(str) {
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(str)) return false;
  const [year, month] = str.split("-").map(Number);
  return month >= 1 && month <= 12;
}

/**
 * 根据传入的信息，组织消息体，并返回
 * @param {string} str - 逗号分隔的字符串
 * @returns {string}
 */
export function organizeMsgBody(str) {
  const strArr = str.split(",");
  let msgBody = "";
  for (const item of strArr) {
    msgBody = msgBody + item.trim() + MESSAGE_SPLIT;
  }
  return msgBody.substring(0, msgBody.length - 1);
}

/**
 * 根据传入的信息，组织消息体，并返回 (使用 MESSAGE_SPLIT 分隔)
 * @param {string} str - 使用 MESSAGE_SPLIT 分隔的字符串
 * @returns {string}
 */
export function organizeRealtimeMsgBody(str) {
  const strArr = str.split(MESSAGE_SPLIT);
  let msgBody = "";
  for (const item of strArr) {
    msgBody = msgBody + item.trim() + MESSAGE_SPLIT;
  }
  return msgBody.substring(0, msgBody.length - 1);
}
