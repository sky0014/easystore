# easystore

An easy store for react and hooks.

Inspired by [icestore](https://github.com/ice-lab/icestore)

## Install

```bash
npm install @sky0014/easystore
```

## Usage

```typescript
// store.ts
import { createStore } from "@sky0014/easystore";
import header from "./header/module";
import todo from "../page/todo/module";

export const { store, getData, useData, register, call, withStore } =
  createStore({
    name: "easystore",
    debug: true,
    middlewares: [], // redux middlewares
    modules: { header, todo },
    // combineReducer: rootReducer => persistReducer(persistConfig, rootReducer) // use with redux-persist
  });

// register支持动态注册
// 如果采用动态注册，在createStore时请传入所有模块类型以便于获得代码提示
// 例如：
// createStore<{
//   header: typeof header,
//   todo: typeof todo,
//   ...
// }>(...)

// todo/module.ts
import { Produce } from "@sky0014/easystore";

export type TodoData = {
  id: number;
  todo: string;
  status: number;
  other?: "one" | "two" | "three";
}[];

const defaultState: TodoData = [
  {
    id: 0,
    todo: "something need todo",
    status: 0,
  },
];

export default {
  // 模块唯一id
  id: "todo",

  // 默认state
  state: defaultState,

  actions: {
    // 同步方法
    addTodo(state: TodoData, todo: string) {
      const id = state.length;
      state.push({
        id,
        todo,
        status: 0,
      });
    },

    // 同步方法
    completeTodo(state: TodoData, id: number) {
      const ele = state.find((v) => v.id === id);
      if (ele) {
        ele.status = 1;
      }
    },

    // 异步方法
    async load(produce: Produce<TodoData>) {
      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve(["1111111", "22222222", "333333", "55555555", "44444"]);
        }, 2000);
      });
      // 1. 调用同步方法修改
      // result.forEach(this.addTodo)
      // or
      // 2. 使用produce直接修改state
      produce((state) => {
        result.forEach((todo) => {
          const id = state.length;
          state.push({
            id,
            todo,
            status: 0,
          });
        });
      });
    },
  },
};

// entry.ts
import React from "react";
import ReactDOM from "react-dom";
import App from "./app";
import { withStore } from "./store";

const StoreApp = withStore(App);

ReactDOM.render(<StoreApp />, document.getElementById("app"));

// todo.ts
import React, { useEffect } from "react";
import { call, useData } from "./store";

function Todo() {
  console.log("render todo");

  // 支持多层级获取，如：todo.a.b.c
  // 在非组件中，可使用 getData 方法获取
  const todo = useData("todo") || [];

  useEffect(() => {
    call("todo/load");
  }, []);

  return (
    <div>
      <input
        type="text"
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            call("todo/addTodo", e.target.value);
            e.target.value = "";
          }
        }}
      ></input>
      {todo
        .concat()
        .sort((a, b) => a.status - b.status)
        .map((v) => (
          <div key={v.id}>
            <input
              type="checkbox"
              onChange={() => {
                call("todo/completeTodo", v.id);
              }}
              checked={v.status}
              disabled={v.status}
            />{" "}
            {v.todo}
          </div>
        ))}
    </div>
  );
}

export default Todo;
```

## Publish

If your first time publish a package, login first:

```bash
npm login --registry=https://registry.npmjs.org
```

Then you can publish:

```bash
npm run pub
```
