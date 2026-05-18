/**
 * 封装消息头
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

import { BAOSTOCK_CLIENT_VERSION, MESSAGE_SPLIT } from "../common/contants.js";
import { addZeroForString } from "../util/stringutil.js";

/**
 * 生成消息头
 * @param {string} msgType - 消息类型
 * @param {number} totalMsgLength - 消息体长度
 * @returns {string}
 */
export function toMessageHeader(msgType, totalMsgLength) {
  return BAOSTOCK_CLIENT_VERSION + MESSAGE_SPLIT + msgType +
    MESSAGE_SPLIT +
    addZeroForString(totalMsgLength, 10, true);
}
