import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "管理员登录" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-copy">
        <Link className="wordmark" href="/">
          GrowLog
        </Link>
        <span className="eyebrow">私有家庭空间</span>
        <h1>欢迎回来。</h1>
        <p>登录后继续记录孩子的日常变化。GrowLog 不开放公开注册。</p>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <span className="eyebrow">Administrator</span>
          <h2 id="login-title">管理员登录</h2>
        </div>
        <LoginForm />
        <p className="care-note">登录信息仅用于保护这个家庭实例。</p>
      </section>
    </main>
  );
}

