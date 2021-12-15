import { Middleware, createStore as _createStore } from "redux";
import { Provider as _Provider } from "react-redux";

export interface StoreModule<T> {
  /** 模块唯一id */
  id: string;
  /** 默认state */
  state: T;
  /** 同步方法 */
  reducers: {
    [key: string]: (state: T, ...args: any[]) => void;
  };
  /** 异步方法 */
  effects: {
    [key: string]: (
      produce: (fn: (state: T) => void) => void,
      ...args: any[]
    ) => Promise<any>;
  };
}

interface Config {
  /** redux中间件 */
  middlewares?: Middleware[];
  /** 日志开关 */
  debug?: boolean;
}

/** 同react-redux Provider */
export const Provider: typeof _Provider;
/**
 * 获取store里的数据
 * @param path 数据路径，以.分割，例如：app.name
 */
export function getData(path: string): any;
/**
 * 获取store里的数据(react hooks)
 * @param path 数据路径，以 . 号分割，例如：app.name
 */
export function useData(path: string): any;
/**
 * 注册模块，支持动态注册
 */
export function register<T>(module: StoreModule<T>): void;
/**
 * 调用模块方法
 * @param path 模块方法路径，以/分割，例如：app/login
 * @param params 方法传参
 */
export function call<T>(path: string, ...params: any[]): Promise<T>;
/**
 * 创建Store，创建完之后使用Provider注入
 * ```jsx
  <Provider store={store}>
    <App />
  </Provider>,
 * ```
 * @param config store配置
 */
export function createStore(config: Config): ReturnType<typeof _createStore>;
