import produce from "immer";
import { useSelector, Provider } from "react-redux";
import {
  applyMiddleware,
  compose,
  createStore as _createStore,
  Middleware,
} from "redux";
import reduxLogger from "redux-logger";
import { createLogger } from "@sky0014/logger";
import React, { ComponentType } from "react";

// from https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type by jcalz
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

type ParametersExceptFirst<T> = T extends (arg0: any, ...rest: infer P) => any
  ? P
  : never;

type ReturnType2<T> = T extends (...args: any) => infer R ? R : any;

type MapActions<T extends Record<string, StoreModule<any>>> = {
  [ID in string & keyof T]: {
    [K in string & keyof T[ID]["actions"] as `${ID}/${K}`]: T[ID]["actions"][K];
  };
};

type Selector<T, J> = (state: T) => J;

/** produce function */
type Produce<T> = (state: T) => void;
type Producer<T> = (produce: Produce<T>) => void;
/** 同步方法 */
type SyncAction<T> = (state: T, ...args: any[]) => void;
/** 异步方法 */
type AsyncAction<T> = (produce: Produce<T>, ...args: any[]) => Promise<any>;

const LOCAL_ACTION = Symbol("actions");

interface StoreModule<T> {
  /** 模块唯一id */
  id: string;
  /** 默认state */
  state: T;
  /** actions */
  actions: Record<string, SyncAction<T> | AsyncAction<T>>;
  /** internal local actions */
  [LOCAL_ACTION]?: Record<string, Function>;
}

interface ReduxAction<T = any> {
  type: string;
  payload?: T;
  skipCheck?: boolean;
  produce?: Produce<any>;
}

interface createStoreOptions<T extends Record<string, StoreModule<any>>> {
  name?: string;
  debug?: boolean;
  middlewares?: Middleware[];
  modules?: T;
}

let storeNumber = 0;

function createStore<
  T extends Record<string, StoreModule<any>>,
  State = {
    [K in keyof T]?: T[K]["state"];
  },
  Actions1 = MapActions<T>,
  Actions2 = UnionToIntersection<Actions1[keyof Actions1]>
>({ middlewares, debug, name, modules }: createStoreOptions<T> = {}) {
  const logger = createLogger();

  logger.initLogger({
    enable: false,
    prefix: name,
  });

  if (!middlewares) {
    middlewares = [];
  }

  if (debug) {
    logger.setEnable(true);
    middlewares.unshift(reduxLogger);
  }

  if (!name) {
    name = "easystore";
    if (storeNumber) {
      name += storeNumber;
    }
    storeNumber++;
  }

  const TYPE_MODULE_REGISTER = `@@${name}/MODULE_REGISTER`;

  const moduleMap: Record<string, StoreModule<any>> = {};

  const initialState: Record<string, any> = {};

  const actions: Record<string, Function> = {};

  const reducers: Record<string, (...args: any[]) => void> = {
    [TYPE_MODULE_REGISTER](state, action) {
      const module = action.payload;
      state[module.id] = module.state;
    },
  };

  const reducer = produce((state, action: ReduxAction<any>) => {
    const r = reducers[action.type];
    if (!r && !action.skipCheck) {
      if (action.type.indexOf("@@redux") === -1) {
        logger.log(`no reducer for action: `, action);
      }
      return;
    }

    if (action.type === TYPE_MODULE_REGISTER) {
      r(state, action);
      return;
    }

    const id = getModuleId(action.type);
    if (!id) {
      logger.log(`action must have a module id: `, action);
      return;
    }

    if (action.produce) {
      action.produce(state[id]);
    } else if (r) {
      r(state[id], ...action.payload);
    }
  });

  function register(m: StoreModule<any>) {
    if (moduleMap[m.id]) {
      throw new Error(`module id=${m.id} already exist!`);
    }

    moduleMap[m.id] = m;

    m[LOCAL_ACTION] = {};

    const localActions = m[LOCAL_ACTION];

    if (m.actions) {
      Object.keys(m.actions).forEach((k) => {
        const path = `${m.id}/${k}`;
        const func = m.actions[k];

        if (!isAsyncAction(func)) {
          reducers[path] = func;
          // create actions
          actions[path] = localActions[k] = (...params: any[]) => {
            store.dispatch({
              type: path,
              payload: params,
            });
          };
        } else {
          const produce: Producer<any> = (func: Produce<any>) => {
            store.dispatch({
              type: `${path} async PRODUCE`,
              skipCheck: true,
              produce: func,
            });
          };
          const bindFunc = func.bind(localActions);
          actions[path] = localActions[k] = (...params: any[]) => {
            store.dispatch({
              type: `${path} async START`,
              skipCheck: true,
            });
            return bindFunc(produce, ...params);
          };
        }
      });
    }

    if (!store) {
      initialState[m.id] = m.state;
    } else {
      store.dispatch({
        type: TYPE_MODULE_REGISTER,
        payload: m,
      });
    }
  }

  if (modules) {
    Object.keys(modules).forEach((id) => register(modules[id]));
  }

  const store = _createStore(
    reducer,
    initialState,
    compose(...middlewares.map((v) => applyMiddleware(v)))
  );

  function getData<T>(selector: Selector<State, T>) {
    return selector(store.getState());
  }

  // react hooks
  function useData<T>(selector: Selector<State, T>) {
    return useSelector<State, T>(selector);
  }

  function call<T extends keyof Actions2>(
    path: T,
    ...params: ParametersExceptFirst<Actions2[T]>
  ): ReturnType2<Actions2[T]> {
    const action = actions[path as string];

    if (!action) {
      logger.log(`wrong action called: ${path}`);
      return;
    }

    return action(...params);
  }

  function withStore<P>(App: ComponentType<P>) {
    return function Wrapper(props: P) {
      return React.createElement(
        Provider,
        { store },
        React.createElement(App, props)
      );
    };
  }

  return {
    store,
    getData,
    useData,
    register,
    call,
    withStore,
  };
}

const asyncReg = /return\s+[^\s;]+?\(/;
function isAsyncAction(func: Function) {
  if (func.constructor && func.constructor.name === "AsyncFunction") {
    return true;
  }

  const funcStr = func.toString();

  if (funcStr.indexOf("regenerator") !== -1) {
    return true;
  }

  if (asyncReg.test(funcStr)) {
    return true;
  }

  return false;
}

function getModuleId(type: string) {
  const index = type.indexOf("/");
  if (index === -1) {
    return null;
  }
  return type.substring(0, index);
}

export { Produce, SyncAction, AsyncAction, createStore };
