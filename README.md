# easystore

An easy store for react and hooks.

Inspired by [icestore](https://github.com/ice-lab/icestore)

## Install

```bash
npm install @sky0014/easystore
```

## Usage

```js
// store.js
import { createStore, register } from "@sky0014/easystore";
import header from "./header/module";
import todo from "../page/todo/module";

// 支持动态注册
register(header);
register(todo);

export default createStore({
  debug: true,
});


// module.js
export default {
  // 模块唯一id
  id: "todo",

  // 默认state
  state: [
    {
      id: 0,
      todo: "something need todo",
      status: 0,
    },
  ],

  actions: {
    // 同步方法
    addTodo(state, todo) {
      const id = state.length;
      state.push({
        id,
        todo,
        status: 0,
      });
    },

    // 同步方法
    completeTodo(state, id) {
      const ele = state.find((v) => v.id === id);
      if (ele) {
        ele.status = 1;
      }
    },

    // 异步方法
    async load(produce) {
      const result = await new Promise((resolve) => {
        setTimeout(() => {
          resolve(["1111111", "22222222", "333333", "55555555", "44444"]);
        }, 2000);
      });
      // 1. 调用同步方法修改
      // result.forEach(this.addTodo)
      // or 2. 使用produce直接修改state
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
  }
};


// todo.js
import React, { useEffect } from "react";
import { call, useData } from "@sky0014/easystore";

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
