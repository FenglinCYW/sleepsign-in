import { Context, h, Schema } from 'koishi'

export const name = 'sleepsign-in'
export const inject = ['database']

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

declare module 'koishi' {
  interface Tables {
    user_sign_in: User_sign_in
  }
}

export interface User_sign_in {
  id: number
  user_id: string
  count: number
  sign_time: string
}

export function apply(ctx: Context) {
  // 判断是否存在数据表
  if (!ctx.database.tables.user_sign_in) {
    ctx.database.extend('user_sign_in', {
      id: {
        type: 'unsigned',
        initial: 1
      },
      user_id: 'string',
      count: 'integer',
      sign_time: 'string'
    }, {
      primary: 'id',
      autoInc: true
    })
  }

  // 晚安命令
  ctx.command('晚安').action(async ({ session }) => {
    let hour = new Date().getHours()
    // 判断是否在签到时间内
    if (hour < 6 || hour >= 21) {
      await session.send("现在不是睡觉时间哦！")
      return;
    }

    try {
      let date = new Date().toLocaleDateString()
      const rows = await ctx.database.get('user_sign_in', {
        user_id: session.userId
      })
      // 判断是否存在该用户
      if (!(rows.length > 0)) {
        // 不存在则创建
        await ctx.database.create('user_sign_in', {
          user_id: session.userId,
          count: 1,
          sign_time: date
        })
      } else {
        // 签到时间是否是今天
        if (rows[0].sign_time === date) {
          await session.send(h('at', { id: session.userId }) + "你已经晚安过了！")
          return;
        }
        // 存在则更新
        await ctx.database.set('user_sign_in', {
          count: rows[0].count + 1,
          sign_time: date
        }, {
          user_id: session.userId
        })
      }
      // 发送晚安消息
      const nowDateRows = await ctx.database.get('user_sign_in', {
        sign_time: date
      })
      await session.send(h('at', { id: session.userId }) + "晚安！你是第" + nowDateRows.length + "个晚安的群友哦！")
    }catch(err){
      console.log('签到失败，原因：' + err)
      ctx.logger.error('晚安失败，原因：' + err)
      await session.send(h('at', { id: session.userId }) + '晚安失败，请稍后再试')
    }
  })

  // 查询晚安次数
  ctx.command('查询晚安次数').action(async ({ session }) => {
    try {
      const rows = await ctx.database.get('user_sign_in', {
        user_id: session.userId
      })
      if (rows.length > 0) {
        await session.send(h('at', { id: session.userId }) + "你已经晚安" + rows[0].count + "次了")
      }else{
        await session.send(h('at', { id: session.userId }) + "你还没有晚安过呢")
      }
    }catch(err){
      console.log('查询失败，原因：' + err)
      ctx.logger.error('查询失败，原因：' + err)
      await session.send(h('at', { id: session.userId }) + '查询失败，请稍后再试')
    }
  })
}
