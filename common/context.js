/**
 * 全局上下文
 * @author: baostock.com
 * @group : baostock.com
 * @contact: baostock@163.com
 */

// 全局变量（使用对象包装以便跨模块修改）
const context = {
  user_id: null,
  default_socket: null,
  apiKey: null,
};

export default context;
