/**
 * baostockjs 主入口
 * 演示 queryHistoryKDataPlus 的使用
 */

import { login, queryHistoryKDataPlus, logout } from "./mod.js";

async function main() {
  // 先登录
  console.log("=== 登录 ===");
  const loginResult = await login("anonymous", "123456");
  console.log("登录结果:", JSON.stringify(loginResult, null, 2));

  if (loginResult.errorCode !== "0") {
    console.error("登录失败，无法继续查询");
    return;
  }

  // 查询历史K线数据
  console.log("\n=== 查询历史K线数据 ===");
  const fields = "date,open,high,low,close,volume,amount";
  const result = await queryHistoryKDataPlus(
    "sh.600000",
    fields,
    "2024-01-01",
    "2024-01-10",
    "d",
    "3",
  );

  console.log("查询结果 errorCode:", result.errorCode);
  console.log("查询结果 errorMsg:", result.errorMsg);
  console.log("查询结果 fields:", result.fields);
  console.log("查询结果 data count:", result.data ? result.data.length : 0);
  console.log("查询结果 code:", result.code);
  console.log("查询结果 frequency:", result.frequency);
  console.log("查询结果 adjustflag:", JSON.stringify(result.adjustflag));
  console.log("查询结果 startDate:", result.startDate);
  console.log("查询结果 endDate:", result.endDate);

  // 打印数据行
  if (result.data && result.data.length > 0) {
    console.log("\n=== 数据详情 ===");
    for (const row of result.data) {
      console.log(row);
    }
  }

  // 登出
  console.log("\n=== 登出 ===");
  const logoutResult = await logout();
  console.log("登出结果:", JSON.stringify(logoutResult, null, 2));
}

main().catch(console.error);
