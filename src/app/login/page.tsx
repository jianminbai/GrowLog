import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "管理员登录" };

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="wordmark" href="/">
          GrowLog
        </Link>
        <h1 id="login-title">管理员登录</h1>
        <LoginForm />
        <p className="care-note">登录信息仅用于保护这个家庭实例。</p>
      </section>
      <section className="login-copy" aria-labelledby="private-space-title">
        <h2 id="private-space-title">只属于你的家庭空间</h2>
        <p>登录后继续记录孩子的日常变化。GrowLog 不开放公开注册。</p>
      </section>
    </main>
  );
}

