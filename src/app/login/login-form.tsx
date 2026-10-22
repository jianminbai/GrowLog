"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password
        })
      });

      if (!response.ok) {
        setPassword("");
        setMessage("邮箱或密码不正确，请重新输入。");
        return;
      }

      router.replace("/today");
      router.refresh();
    } catch {
      setPassword("");
      setMessage("暂时无法连接 GrowLog，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        <span>管理员邮箱</span>
        <input name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        <span>密码</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {message ? (
        <p className="form-message" role="alert">
          {message}
        </p>
      ) : null}
      <button className="primary-action login-submit" type="submit" disabled={pending}>
        {pending ? "正在验证…" : "进入 GrowLog"}
      </button>
    </form>
  );
}

