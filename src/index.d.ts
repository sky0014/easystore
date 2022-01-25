import React, { ComponentType } from "react";
import { Middleware, createStore as _createStore } from "redux";

type Store = ReturnType<typeof _createStore>;

export interface StoreModule<T> {
  /** 模块唯一id */
  id: string;
  /** 默认state */
  state: T;
  /** actions */
  actions: {
    [key: string]:
      | ((state: T, ...args: any[]) => void) // 同步方法
      | ((
          produce: (fn: (state: T) => void) => void,
          ...args: any[]
        ) => Promise<any>); // 异步方法
  };
}

interface Config {
  /** redux中间件 */
  middlewares?: Middleware[];
  /** 日志开关 */
  debug?: boolean;
}

/**
 * 获取store里的数据
 * @param path 数据路径，以.分割，例如：app.name
 */
export function getData<T>(path: string): T;
/**
 * 获取store里的数据(react hooks)
 * @param path 数据路径，以 . 号分割，例如：app.name
 */
export function useData<T>(path: string): T;
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
export function createStore(config: Config): Store;
/**
 * 连接store
 * @param store store对象
 * @param App app入口
 *
 * @returns 连接后的React.FC组件
 */
export function withStore(store: Store, App: ComponentType): React.FC;
