/**
 * baostockjs 测试文件
 * 测试登录、登出和历史K线查询功能
 */

import { login, logout, queryHistoryKDataPlus, querySZ50Stocks, queryHS300Stocks, queryZZ500Stocks, queryStockIndustry, queryStockBasic, queryPerformanceExpressReport } from "../mod.js";
import context from "../common/context.js";
import { assertEquals, assert } from "jsr:@std/assert";

Deno.test("login and logout", async () => {
  // 测试登录（默认密码为 "123456" 与 Python 库一致）
  const loginResult = await login("anonymous", "123456");
  console.log("Login result:", JSON.stringify(loginResult));

  // 验证登录成功
  assertEquals(loginResult.errorCode, "0", "登录应该返回错误代码 0");
  assertEquals(loginResult.errorMsg, "success", "登录应该返回成功消息");
  assert(loginResult.data !== null, "登录返回数据不应为空");
  assert(loginResult.data.userId !== null, "登录应返回用户ID");

  // 测试登出
  const logoutResult = await logout();
  console.log("Logout result:", JSON.stringify(logoutResult));

  // 验证登出成功
  assertEquals(logoutResult.errorCode, "0", "登出应该返回错误代码 0");
  assertEquals(logoutResult.errorMsg, "success", "登出应该返回成功消息");
});

Deno.test("login with empty username should fail", async () => {
  const result = await login("", "password");
  assertEquals(result.errorCode, "10001008", "空用户名应返回用户名错误代码");
});

Deno.test("login with empty password should fail", async () => {
  const result = await login("user", "");
  assertEquals(result.errorCode, "10001009", "空密码应返回密码错误代码");
});

Deno.test("logout without login should fail", async () => {
  const result = await logout();
  assertEquals(result.errorCode, "10001001", "未登录登出应返回未登录错误代码");
});

Deno.test("query history k data plus", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询历史K线数据
  const fields = "date,open,high,low,close,volume,amount";
  const result = await queryHistoryKDataPlus(
    "sh.600000",
    fields,
    "2024-01-01",
    "2024-01-10",
    "d",
    "3",
  );

  console.log("Query result errorCode:", result.errorCode);
  console.log("Query result errorMsg:", result.errorMsg);
  console.log("Query result fields:", result.fields);
  console.log("Query result data count:", result.data ? result.data.length : 0);
  console.log("Query result code:", result.code);
  console.log("Query result frequency:", result.frequency);
  console.log("Query result adjustflag:", JSON.stringify(result.adjustflag));
  console.log("Query result startDate:", result.startDate);
  console.log("Query result endDate:", result.endDate);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询应该返回错误代码 0");

  // 验证返回数据
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");
  assert(result.fields.length > 0, "查询应返回字段列表");

  // 验证字段内容
  assertEquals(result.code, "sh.600000", "返回的证券代码应匹配");
  assertEquals(result.frequency, "d", "返回的数据类型应匹配");
  // adjustflag 服务器可能返回空字符串，这里只检查它存在
  assertEquals(typeof result.adjustflag, "string", "返回的复权类型应为字符串");

  // 测试 getRowData() 方法（先调用，因为 getData() 会消耗 curRowNum）
  const rowData = result.getRowData();
  assert(rowData.length > 0, "getRowData() 应返回数据");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");
  assert(dataObjects[0].date !== undefined, "数据应包含 date 字段");
  assert(dataObjects[0].open !== undefined, "数据应包含 open 字段");

  // 测试 next() 方法
  const hasNext = await result.next();
  console.log("Has next page:", hasNext);

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query history k data without login should fail", async () => {
  // 确保 context 被清空（前一个测试可能已登录）
  // 直接清空 context 而不调用 logout（避免 socket 泄漏）
  context.user_id = null;
  context.default_socket = null;

  const fields = "date,open,high,low,close,volume,amount";
  const result = await queryHistoryKDataPlus(
    "sh.600000",
    fields,
    "2024-01-01",
    "2024-01-10",
    "d",
    "3",
  );

  assertEquals(result.errorCode, "10001001", "未登录查询应返回未登录错误代码");
});

Deno.test("query history k data with invalid code should fail", async () => {
  const result = await queryHistoryKDataPlus(
    "invalid",
    "date,open",
    "2024-01-01",
    "2024-01-10",
    "d",
    "3",
  );

  assertEquals(result.errorCode, "10004006", "无效代码应返回参数错误");
});

Deno.test("query history k data with empty fields should fail", async () => {
  const result = await queryHistoryKDataPlus(
    "sh.600000",
    "",
    "2024-01-01",
    "2024-01-10",
    "d",
    "3",
  );

  assertEquals(result.errorCode, "10004006", "空字段应返回参数错误");
});

Deno.test("query sz50 stocks", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询上证50成分股
  const result = await querySZ50Stocks();
  console.log("SZ50 result errorCode:", result.errorCode);
  console.log("SZ50 result errorMsg:", result.errorMsg);
  console.log("SZ50 result data count:", result.data ? result.data.length : 0);
  console.log("SZ50 result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询上证50应该返回错误代码 0");
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query hs300 stocks", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询沪深300成分股
  const result = await queryHS300Stocks();
  console.log("HS300 result errorCode:", result.errorCode);
  console.log("HS300 result errorMsg:", result.errorMsg);
  console.log("HS300 result data count:", result.data ? result.data.length : 0);
  console.log("HS300 result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询沪深300应该返回错误代码 0");
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query zz500 stocks", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询中证500成分股
  const result = await queryZZ500Stocks();
  console.log("ZZ500 result errorCode:", result.errorCode);
  console.log("ZZ500 result errorMsg:", result.errorMsg);
  console.log("ZZ500 result data count:", result.data ? result.data.length : 0);
  console.log("ZZ500 result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询中证500应该返回错误代码 0");
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query index stocks without login should fail", async () => {
  // 确保 context 被清空
  context.user_id = null;
  context.default_socket = null;

  const result = await querySZ50Stocks();
  assertEquals(result.errorCode, "10001001", "未登录查询应返回未登录错误代码");
});

Deno.test("query index stocks with invalid date should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用无效日期查询
  const result = await querySZ50Stocks("invalid-date");
  assertEquals(result.errorCode, "10004010", "无效日期应返回日期格式错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query stock industry", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询行业分类
  const result = await queryStockIndustry("sh.600000");
  console.log("StockIndustry result errorCode:", result.errorCode);
  console.log("StockIndustry result errorMsg:", result.errorMsg);
  console.log("StockIndustry result data count:", result.data ? result.data.length : 0);
  console.log("StockIndustry result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询行业分类应该返回错误代码 0");
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");
  assert(dataObjects[0].code !== undefined, "数据应包含 code 字段");
  assert(dataObjects[0].industry !== undefined, "数据应包含 industry 字段");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query stock industry without login should fail", async () => {
  // 确保 context 被清空
  context.user_id = null;
  context.default_socket = null;

  const result = await queryStockIndustry("sh.600000");
  assertEquals(result.errorCode, "10001001", "未登录查询应返回未登录错误代码");
});

Deno.test("query stock industry with invalid date should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用无效日期查询
  const result = await queryStockIndustry("sh.600000", "invalid-date");
  assertEquals(result.errorCode, "10004010", "无效日期应返回日期格式错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query stock basic", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询证券基本资料（使用 codeName 参数）
  const result = await queryStockBasic("sh.600000");
  console.log("StockBasic result errorCode:", result.errorCode);
  console.log("StockBasic result errorMsg:", result.errorMsg);
  console.log("StockBasic result data count:", result.data ? result.data.length : 0);
  console.log("StockBasic result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询证券基本资料应该返回错误代码 0");
  assert(result.data !== null, "查询返回数据不应为空");
  assert(result.data.length > 0, "查询应返回至少一条数据");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  assert(dataObjects.length > 0, "getData() 应返回数据");
  assert(dataObjects[0].code !== undefined, "数据应包含 code 字段");
  assert(dataObjects[0].ipoDate !== undefined, "数据应包含 ipoDate 字段");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query stock basic without login should fail", async () => {
  // 确保 context 被清空
  context.user_id = null;
  context.default_socket = null;

  const result = await queryStockBasic("sh.600000");
  assertEquals(result.errorCode, "10001001", "未登录查询应返回未登录错误代码");
});

Deno.test("query stock basic with code name", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用证券名称模糊查询
  const result = await queryStockBasic("", "浦发银行");
  console.log("StockBasic by name result errorCode:", result.errorCode);
  console.log("StockBasic by name result data count:", result.data ? result.data.length : 0);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询证券基本资料应该返回错误代码 0");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query stock basic with invalid code should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用无效代码查询
  const result = await queryStockBasic("invalid");
  assertEquals(result.errorCode, "10004006", "无效代码应返回参数错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query performance express report", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 查询业绩快报（使用日期范围）
  const result = await queryPerformanceExpressReport("sh.600000", "2023-01-01", "2023-12-31");
  console.log("PerformanceExpress result errorCode:", result.errorCode);
  console.log("PerformanceExpress result errorMsg:", result.errorMsg);
  console.log("PerformanceExpress result data count:", result.data ? result.data.length : 0);
  console.log("PerformanceExpress result fields:", result.fields);

  // 验证查询成功
  assertEquals(result.errorCode, "0", "查询业绩快报应该返回错误代码 0");

  // 验证字段
  assert(result.fields.length > 0, "应返回字段列表");

  // 测试 getData() 方法
  const dataObjects = result.getData();
  if (dataObjects.length > 0) {
    assert(dataObjects[0].code !== undefined, "数据应包含 code 字段");
    assert(dataObjects[0].performanceExpPubDate !== undefined, "数据应包含 performanceExpPubDate 字段");
    assert(dataObjects[0].performanceExpStatDate !== undefined, "数据应包含 performanceExpStatDate 字段");
  }

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query performance express report without login should fail", async () => {
  // 确保 context 被清空
  context.user_id = null;
  context.default_socket = null;

  const result = await queryPerformanceExpressReport("sh.600000");
  assertEquals(result.errorCode, "10001001", "未登录查询应返回未登录错误代码");
});

Deno.test("query performance express report with invalid start date should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用无效起始日期查询
  const result = await queryPerformanceExpressReport("sh.600000", "invalid-date");
  assertEquals(result.errorCode, "10004010", "无效起始日期应返回日期格式错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query performance express report with invalid end date should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 使用无效截止日期查询
  const result = await queryPerformanceExpressReport("sh.600000", "2023-01-01", "invalid-date");
  assertEquals(result.errorCode, "10004010", "无效截止日期应返回日期格式错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query performance express report with start date > end date should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 起始日期大于截止日期
  const result = await queryPerformanceExpressReport("sh.600000", "2024-01-01", "2023-01-01");
  assertEquals(result.errorCode, "10004009", "起始日期大于截止日期应返回错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});

Deno.test("query performance express report with empty code should fail", async () => {
  // 先登录
  const loginResult = await login("anonymous", "123456");
  assertEquals(loginResult.errorCode, "0", "登录应该成功");

  // 空代码查询
  const result = await queryPerformanceExpressReport("");
  assertEquals(result.errorCode, "10004006", "空代码应返回参数错误代码");

  // 登出
  const logoutResult = await logout();
  assertEquals(logoutResult.errorCode, "0", "登出应该成功");
});
