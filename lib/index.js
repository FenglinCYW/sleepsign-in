var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Config: () => Config,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(src_exports);
var import_koishi = require("koishi");
var name = "sleepsign-in";
var inject = ["database"];
var Config = import_koishi.Schema.object({});
async function apply(ctx, config) {
  if (ctx.database && ctx.database.tables) {
    if (!ctx.database.tables.user_sign_in) {
      ctx.model.extend("user_sign_in", {
        id: {
          type: "unsigned",
          initial: 1
        },
        user_id: "string",
        count: {
          type: "unsigned",
          initial: 1
        },
        signTime: "string"
      }, {
        primary: "id",
        autoInc: true
      });
    }
  } else {
    console.error("ctx.database or ctx.database.tables is undefined");
  }
  ctx.command("晚安").action(async ({ session }) => {
    let date = /* @__PURE__ */ new Date();
    let hour = date.getHours();
    if (!(hour < 6 || hour >= 21)) {
      session.send(
        (0, import_koishi.h)("at", { id: session.userId }) + "现在不是睡觉的时间！可以晚安的时间是21点到6点！"
      );
      return;
    }
    try {
      const rows = await ctx.database.get("user_sign_in", {
        user_id: session.userId
      });
      if (rows.length > 0) {
        if (rows[0].signTime === date.toLocaleDateString()) {
          session.send(
            (0, import_koishi.h)("at", { id: session.userId }) + "你已经晚安过了，明天再来吧！"
          );
          return;
        }
        await ctx.database.set("user_sign_in", { user_id: { $in: [session.userId] } }, {
          count: rows[0].count + 1,
          signTime: date.toLocaleDateString()
        });
      } else {
        await ctx.database.create("user_sign_in", {
          user_id: session.userId,
          count: 1,
          signTime: date.toLocaleDateString()
        });
      }
      const dateRows = await ctx.database.get("user_sign_in", {
        signTime: date.toLocaleDateString()
      });
      session.send((0, import_koishi.h)("at", { id: session.userId }) + "晚安！你是第" + dateRows.length + "个晚安的群友哦！");
    } catch (err) {
      console.error("Failed to create or update user sign-in record", err);
      session.send((0, import_koishi.h)("at", { id: session.userId }) + "晚安失败，请稍后再试。");
    }
  });
  ctx.command("查询晚安次数").action(async ({ session }) => {
    try {
      const rows = await ctx.database.get("user_sign_in", {
        user_id: session.userId
      });
      session.send(
        (0, import_koishi.h)("at", { id: session.userId }) + "你已经签到了 " + rows[0].count + " 次。"
      );
    } catch (err) {
      console.error("Failed to fetch user sign-in record", err);
      session.send((0, import_koishi.h)("at", { id: session.userId }) + "查询失败，请稍后再试。");
    }
  });
}
__name(apply, "apply");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Config,
  apply,
  inject,
  name
});
