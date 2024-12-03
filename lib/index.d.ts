import { Context, Schema } from "koishi";
export declare const name = "sleepsign-in";
export declare const inject: string[];
declare module "koishi" {
    interface Tables {
        user_sign_in: UserSignIn;
    }
}
export interface UserSignIn {
    id: number;
    user_id: string;
    count: number;
    signTime: string;
}
export interface Config {
}
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): Promise<void>;
