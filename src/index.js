import produce from "immer";
import { useSelector, Provider } from "react-redux";
import { applyMiddleware, compose, createStore as _createStore } from "redux";
import reduxLogger from "redux-logger";
import logger from "@sky0014/logger";

logger.initLogger({
  enable: false,
  prefix: "easystore",
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
    throw new Error("you must create store first!");
  }

  return internalGetData(store.getState(), path);
}

// react hooks
// 不给默认值参数，以免上层使用方式不对造成不必要的组件刷新
function useData(path) {
  return useSelector((state) => internalGetData(state, path));
}

function register(m) {
  if (moduleMap[m.id]) {
    throw new Error(`module id=${m.id} already exist!`);
  }

  moduleMap[m.id] = m;

  const localActions = (m[Symbol("actions")] = {});

  m.reducers &&
    Object.keys(m.reducers).forEach((k) => {
      const path = `${m.id}/${k}`;
      reducers[path] = m.reducers[k];
      // create actions
      actions[path] = localActions[k] = (...params) => {
        store.dispatch({
          type: path,
          payload: params,
        });
      };
    });

  m.effects &&
    Object.keys(m.effects).forEach((k) => {
      const produce = (func) => {
        store.dispatch({
          type: `${m.id}/${k} async PRODUCE`,
          skipCheck: true,
          produce: func,
        });
      };
      actions[`${m.id}/${k}`] = localActions[k] = async (...params) => {
        store.dispatch({
          type: `${m.id}/${k} async START`,
          skipCheck: true,
        });
        return await m.effects[k].bind(localActions)(produce, ...params);
      };
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

export { Provider, getData, useData, register, call, createStore };
