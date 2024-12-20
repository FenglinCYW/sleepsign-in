import { Context, h, is, Schema } from 'koishi'

export const name = 'sleepsign-in'
export const inject = ['database']

export interface IConfig {
  enableSignTime: boolean
  signStartTime: number
  signEndTime: number
  goodNightMsg: string
  missedSignMsg: string
  repeatSignMsg: string
  succeedMsg: string
}

export const Config: Schema<IConfig> = Schema.intersect([
  Schema.object({
    enableSignTime: Schema.boolean().default(false).description('是否自定义签到时间，默认签到时间为晚上22点到明早6点'),
  }),
  Schema.union([
    Schema.object({
      enableSignTime: Schema.const(true).required(),
      signStartTime: Schema.number().min(1).max(24).default(22).description('签到开始时间'),
      signEndTime: Schema.number().min(1).max(24).default(6).description('签到结束时间')
    }),
    Schema.object({}),
  ]).description('签到时间配置') as Schema,

  Schema.object({
    goodNightMsg: Schema.string().default('晚安').description('晚安签到的触发消息'),
    missedSignMsg: Schema.string().default('现在不是睡觉时间哦！').description('未到晚安时间的提醒消息'),
    repeatSignMsg: Schema.string().default('你已经晚安过了哦！').description('重复晚安的提醒消息'),
    succeedMsg: Schema.string().default('晚安！你是第-rank个晚安的群友哦！').description('晚安成功的提醒消息，-rank为排名，-time为晚安时间')
  }).description('晚安消息配置')
])

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

export function apply(ctx: Context, config: IConfig) {
  const logger = ctx.logger(ctx.name)
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

  // 监听消息事件 如果是晚安则进行签到
  ctx.middleware(async (session, next) => {
    let date = new Date()
    // 判断消息内容是否是晚安
    if (session.content === config.goodNightMsg) {
      // 判断是否在签到时间内
      if (!isDuringSignTime(date, config))
        return (h('at', { id: session.userId }) + ' ' + config.missedSignMsg)
      try {
        let dateStr = date.toLocaleString()
        const rows = await ctx.database.get('user_sign_in', {
          user_id: session.userId
        })
        // 判断是否存在该用户
        if (!(rows.length > 0)) {
          // 不存在则创建
          await ctx.database.create('user_sign_in', {
            user_id: session.userId,
            count: 1,
            sign_time: dateStr
          })
        } else {
          // 签到时间是否是今天
          if (!isDuringSignTime(new Date(rows[0].sign_time), config))
            return (h('at', { id: session.userId }) + ' ' + config.repeatSignMsg)
          // 存在则更新
          await ctx.database.set('user_sign_in', {
            user_id: session.userId
          }, {
            count: rows[0].count + 1,
            sign_time: dateStr
          })
        }

        const succeedMsg = config.succeedMsg
        .replace('-rank', (await ctx.database.get('user_sign_in', {sign_time: dateStr})).length.toString())
        .replace('-time', date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
          
        return succeedMsg
      }catch(err){
        logger.error('晚安失败，原因：' + err)
        return (h('at', { id: session.userId }) + ' ' + '晚安失败，请稍后再试')
      }
    } else {
      return next()
    }
  })

  // 查询晚安次数命令
  ctx.command('查询晚安次数').action(async ({ session }) => {
    try {
      const rows = await ctx.database.get('user_sign_in', {
        user_id: session.userId
      })
      if (rows.length > 0) {
        await session.send(h('at', { id: session.userId }) + ' ' + "你已经晚安" + rows[0].count + "次了")
      }else{
        await session.send(h('at', { id: session.userId }) + ' ' + "你还没有晚安过呢")
      }
    }catch(err){
      logger.error('查询失败，原因：' + err)
      await session.send(h('at', { id: session.userId }) + ' ' + '查询失败，请稍后再试')
    }
  })
}

function isDuringSignTime(date: Date, config: IConfig) : boolean {
  let startTime = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate(), config.signStartTime, 0, 0)
  let endTime = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate(), config.signEndTime, 0, 0)
  // 时间是否跨天
  const t = startTime > endTime

  // 交换时间
  if (t)
    [startTime, endTime] = [endTime, startTime]

  if (date >= startTime && date <= endTime)
    return t ? false:true
  else
    return t ? true:false
  
}

