/**
 * baostockjs 主入口
 * 演示 queryHistoryKDataPlus、querySZ50Stocks、queryHS300Stocks、queryZZ500Stocks 的使用
 */

import { login, queryHistoryKDataPlus, querySZ50Stocks, queryHS300Stocks, queryZZ500Stocks, logout } from "./mod.ts";

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

  // 查询上证50成分股
  console.log("\n=== 查询上证50成分股 ===");
  const sz50Result = await querySZ50Stocks();
  console.log("上证50 errorCode:", sz50Result.errorCode);
  console.log("上证50 errorMsg:", sz50Result.errorMsg);
  console.log("上证50 fields:", sz50Result.fields);
  console.log("上证50 data count:", sz50Result.data ? sz50Result.data.length : 0);
  if (sz50Result.data && sz50Result.data.length > 0) {
    console.log("\n上证50成分股列表（前10只）:");
    const stocks = sz50Result.getData();
    for (let i = 0; i < Math.min(10, stocks.length); i++) {
      console.log(`  ${stocks[i].code} - ${stocks[i].code_name}`);
    }
    console.log(`  ... 共 ${stocks.length} 只`);
  }

  // 查询沪深300成分股
  console.log("\n=== 查询沪深300成分股 ===");
  const hs300Result = await queryHS300Stocks();
  console.log("沪深300 errorCode:", hs300Result.errorCode);
  console.log("沪深300 errorMsg:", hs300Result.errorMsg);
  console.log("沪深300 fields:", hs300Result.fields);
  console.log("沪深300 data count:", hs300Result.data ? hs300Result.data.length : 0);
  if (hs300Result.data && hs300Result.data.length > 0) {
    console.log("\n沪深300成分股列表（前10只）:");
    const stocks = hs300Result.getData();
    for (let i = 0; i < Math.min(10, stocks.length); i++) {
      console.log(`  ${stocks[i].code} - ${stocks[i].code_name}`);
    }
    console.log(`  ... 共 ${stocks.length} 只`);
  }

  // 查询中证500成分股
  console.log("\n=== 查询中证500成分股 ===");
  const zz500Result = await queryZZ500Stocks();
  console.log("中证500 errorCode:", zz500Result.errorCode);
  console.log("中证500 errorMsg:", zz500Result.errorMsg);
  console.log("中证500 fields:", zz500Result.fields);
  console.log("中证500 data count:", zz500Result.data ? zz500Result.data.length : 0);
  if (zz500Result.data && zz500Result.data.length > 0) {
    console.log("\n中证500成分股列表（前10只）:");
    const stocks = zz500Result.getData();
    for (let i = 0; i < Math.min(10, stocks.length); i++) {
      console.log(`  ${stocks[i].code} - ${stocks[i].code_name}`);
    }
    console.log(`  ... 共 ${stocks.length} 只`);
  }

  // 登出
  console.log("\n=== 登出 ===");
  const logoutResult = await logout();
  console.log("登出结果:", JSON.stringify(logoutResult, null, 2));
}

main().catch(console.error);
