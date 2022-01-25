import produce from "immer";
import { useSelector, Provider } from "react-redux";
import { applyMiddleware, compose, createStore as _createStore } from "redux";
import reduxLogger from "redux-logger";
import { createLogger } from "@sky0014/logger";
import React from "react";

const PREFIX = "easystore";

const logger = createLogger();

logger.initLogger({
  enable: false,
  prefix: PREFIX,
});

let store;

const TYPE_MODULE_REGISTER = "@@easystore/MODULE_REGISTER";

const moduleMap = {};

const initialState = {};

const actions = {};

const reducers = {
  [TYPE_MODULE_REGISTER](state, action) {
    const module = action.payload;
    state[module.id] = module.state;
  },
};

function getModuleId(type) {
  const index = type.indexOf("/");
  if (index === -1) {
    return null;
  }
  return type.substring(0, index);
}

function internalGetData(state, path, defaultValue) {
  const array = path.split(".");
  let value = state;

  for (let i = 0, len = array.length; i < len; i++) {
    if (!value || !Object.prototype.hasOwnProperty.call(value, array[i])) {
      return defaultValue;
    }
    value = value[array[i]];
  }

  return value;
}

const reducer = produce((state, action) => {
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

function getData(path) {
  if (!store) {
    throw new Error(`[${PREFIX}] you must create store first!`);
  }

  return internalGetData(store.getState(), path);
}

// react hooks
// 不给默认值参数，以免上层使用方式不对造成不必要的组件刷新
function useData(path) {
  return useSelector((state) => internalGetData(state, path));
}

const asyncReg = /^function.*{\s*return\s+\w+\(/;
function isAsync(func) {
  if (func.constructor && func.constructor.name === "AsyncFunction") {
    return true;
  }

  const funcStr = func.toString();

  if (funcStr.indexOf("regeneratorRuntime") !== -1) {
    return true;
  }

  if (asyncReg.test(funcStr)) {
    return true;
  }

  return false;
}

function register(m) {
  if (moduleMap[m.id]) {
    throw new Error(`[${PREFIX}] module id=${m.id} already exist!`);
  }

  moduleMap[m.id] = m;

  const localActions = (m[Symbol("actions")] = {});

  m.actions &&
    Object.keys(m.actions).forEach((k) => {
      const path = `${m.id}/${k}`;
      const func = m.actions[k];

      if (!isAsync(func)) {
        reducers[path] = func;
        // create actions
        actions[path] = localActions[k] = (...params) => {
          store.dispatch({
            type: path,
            payload: params,
          });
        };
      } else {
        const produce = (func) => {
          store.dispatch({
            type: `${path} async PRODUCE`,
            skipCheck: true,
            produce: func,
          });
        };
        const bindFunc = func.bind(localActions);
        actions[path] = localActions[k] = async (...params) => {
          store.dispatch({
            type: `${path} async START`,
            skipCheck: true,
          });
          return await bindFunc(produce, ...params);
        };
      }
    });

  if (!store) {
    initialState[m.id] = m.state;
  } else {
    store.dispatch({
      type: TYPE_MODULE_REGISTER,
      payload: m,
    });
  }
}

async function call(path, ...params) {
  const action = actions[path];

  if (!action) {
    logger.log(`wrong action called: ${path}`);
    return;
  }

  return await action(...params);
}

function createStore({ middlewares, debug } = {}) {
  if (!middlewares) {
    middlewares = [];
  }
  if (debug) {
    logger.setEnable(true);
    middlewares.unshift(reduxLogger);
  }
  middlewares = middlewares.map((v) => applyMiddleware(v));
  return (store = _createStore(reducer, initialState, compose(...middlewares)));
}

function withStore(store, App) {
  return function Wrapper() {
    return (
      <Provider store={store}>
        <App />
      </Provider>
    );
  };
}

export { getData, useData, register, call, createStore, withStore };
