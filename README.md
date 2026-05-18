# baostockjs

[![JSR](https://jsr.io/badges/@littleyy/baostockjs)](https://jsr.io/@littleyy/baostockjs)

基于 Python [baostock](http://baostock.com) 证券数据接口库 0.9.1 版本实现的 Deno/JSR 第三方库。

## 安装

### JSR（推荐）

```bash
deno add jsr:@littleyy/baostockjs
```

### 直接导入

```typescript
import { login, logout, queryHistoryKDataPlus } from "https://jsr.io/@littleyy/baostockjs/mod.js";
```

## 快速开始

```typescript
import { login, logout, queryHistoryKDataPlus } from "jsr:@littleyy/baostockjs";

// 登录
const lg = await login("anonymous", "123456");
if (lg.errorCode === "0") {
  console.log("登录成功！用户ID:", lg.data.userId);
} else {
  console.error("登录失败:", lg.errorMsg);
}

// 查询历史K线数据
const rs = await queryHistoryKDataPlus(
  "sh.600000",                    // 证券代码
  "date,open,high,low,close,volume,amount", // 字段
  "2024-01-01",                   // 开始日期
  "2024-01-10",                   // 结束日期
  "d",                            // 频率：d=日k线, w=周, m=月
  "3",                            // 复权类型：1=后复权, 2=前复权, 3=不复权
);

if (rs.errorCode === "0") {
  // 逐行读取数据
  while (rs.next()) {
    const rowData = rs.getRowData();
    console.log(rowData);
  }

  // 或一次性获取所有数据（返回对象数组）
  const dataList = rs.getData();
  console.log(dataList);
}

// 登出
const lgout = await logout();
if (lgout.errorCode === "0") {
  console.log("登出成功");
}
```

## API 文档

### `login(username?, password?)`

登录到 baostock 服务器。

**参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| username | `string` | `"anonymous"` | 用户名 |
| password | `string` | `"123456"` | 密码 |

**返回：** `Promise<ResultData>`

**ResultData 结构：**
```typescript
{
  errorCode: string;  // "0" 表示成功，其他值为错误码
  errorMsg: string;   // 错误信息
  data: {
    errorCode: string;
    errorMsg: string;
    method: string;   // 响应方法名
    userId: string;   // 用户ID
  } | null;
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| `0` | 成功 |
| `10001001` | 未登录 |
| `10001008` | 用户ID不能为空 |
| `10001009` | 密码不能为空 |

---

### `logout()`

登出 baostock 服务器，关闭网络连接并清理上下文。

**返回：** `Promise<ResultData>`

**示例：**
```typescript
const result = await logout();
if (result.errorCode === "0") {
  console.log("登出成功");
}
```

---

### `queryHistoryKDataPlus(code, fields, startDate, endDate, frequency, adjustflag)`

查询历史K线数据。

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| code | `string` | 证券代码，格式如 `"sh.600000"`（9位） |
| fields | `string` | 字段列表，逗号分隔，如 `"date,open,high,low,close,volume,amount"` |
| startDate | `string` | 开始日期，格式 `"YYYY-MM-DD"` |
| endDate | `string` | 结束日期，格式 `"YYYY-MM-DD"` |
| frequency | `string` | 数据类型：`"d"`=日k线, `"w"`=周, `"m"`=月, `"5"`=5分钟, `"15"`=15分钟, `"30"`=30分钟, `"60"`=60分钟 |
| adjustflag | `string` | 复权类型：`"1"`=后复权, `"2"`=前复权, `"3"`=不复权 |

**返回：** `Promise<ResultData>`

**ResultData 属性：**
| 属性 | 类型 | 说明 |
|------|------|------|
| errorCode | `string` | 错误码，`"0"` 表示成功 |
| errorMsg | `string` | 错误信息 |
| code | `string` | 证券代码 |
| codeName | `string` | 证券名称 |
| fields | `string[]` | 字段列表 |
| data | `Array<Array<string>>` | 原始数据（二维数组） |
| frequency | `string` | 数据类型 |
| adjustflag | `string` | 复权类型 |
| startDate | `string` | 开始日期 |
| endDate | `string` | 结束日期 |

**ResultData 方法：**
| 方法 | 返回 | 说明 |
|------|------|------|
| `isSuccess()` | `boolean` | 判断请求是否成功 |
| `isFailed()` | `boolean` | 判断请求是否失败 |
| `next()` | `Promise<boolean>` | 移动到下一条数据（支持分页） |
| `getRowData()` | `string[]` | 获取当前行数据 |
| `getData()` | `Array<Object>` | 获取所有数据（返回字段名-值对象数组） |

**支持的字段：**
| 字段名 | 说明 |
|--------|------|
| date | 交易日 |
| open | 开盘价 |
| high | 最高价 |
| low | 最低价 |
| close | 收盘价 |
| volume | 成交量（股） |
| amount | 成交额（元） |
| adjustflag | 复权状态 |
| turn | 换手率 |
| tradestatus | 交易状态 |
| pctChg | 涨跌幅 |
| peTTM | 滚动市盈率 |
| pbMRQ | 市净率 |
| psTTM | 滚动市销率 |
| pcfNcfTTM | 滚动市现率 |
| isST | 是否ST |

---

## 项目结构

```
baostockjs/
├── deno.json                    # 项目配置
├── mod.js                       # 入口模块，导出所有公共 API
├── README.md                    # 本文件
├── common/
│   ├── contants.js              # 常量定义（消息类型、错误码、分隔符等）
│   └── context.js               # 全局上下文（socket 连接、用户ID）
├── data/
│   ├── messageheader.js         # 消息头封装
│   ├── msg.js                   # 消息处理
│   └── resultset.js             # 结果集 ResultData 类
├── login/
│   └── loginout.js              # 登录/登出功能
├── security/
│   └── history.js               # 历史K线数据查询
├── util/
│   ├── socketutil.js            # TCP Socket 通信工具
│   └── stringutil.js            # 字符串工具
└── tests/
    └── mod.js                   # 测试文件（8 个测试用例）
```

## 开发

### 运行测试

```bash
deno test --allow-net --allow-read --allow-env ./tests/mod.js
```

### 权限说明

- `--allow-net`：需要网络访问以连接 baostock 服务器（`localhost:10031`）
- `--allow-read`：读取配置文件
- `--allow-env`：环境变量访问

## 协议兼容性

- 完全兼容 baostock Python 库 0.9.1 的消息协议
- 使用相同的消息格式、分隔符（`\x01`）和 CRC32 校验
- 默认密码 `"123456"` 与 Python 库一致
- 支持分页查询（`next()` 方法自动请求下一页）

## 许可证

MIT
