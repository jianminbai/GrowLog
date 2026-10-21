"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { CSRF_COOKIE_NAME } from "@/modules/auth/auth-constants";

type MealItemDto = {
  id: string;
  name: string;
  category: string | null;
  offeredAmount: number | null;
  consumedAmount: number | null;
  estimatedAmount: number | null;
  amountUnit: string | null;
  isNewFood: boolean;
  reactionNote: string | null;
};
type MealDto = {
  id: string;
  type: string;
  occurredAt: string;
  appetite: string | null;
  notes: string | null;
  source: string;
  deletedAt: string | null;
  items: MealItemDto[];
};
type BeverageDto = {
  id: string;
  type: string;
  volumeMl: number | null;
  occurredAt: string;
  notes: string | null;
  source: string;
  deletedAt: string | null;
};

const csrf = () => decodeURIComponent(document.cookie.split("; ")
  .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`))?.split("=")[1] ?? "");
const local = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  .toISOString().slice(0, 16);
const nullableNumber = (form: FormData, field: string) => {
  const value = String(form.get(field) ?? "");
  return value === "" ? null : Number(value);
};
const mealTypes = [
  ["BREAKFAST", "早餐"], ["LUNCH", "午餐"], ["DINNER", "晚餐"],
  ["MORNING_SNACK", "上午加餐"], ["AFTERNOON_SNACK", "下午加餐"], ["OTHER", "其他"]
];
const beverageTypes = [["MILK", "奶"], ["WATER", "水"], ["YOGURT_DRINK", "酸奶饮品"], ["OTHER", "其他"]];

export function NutritionClient({
  childId,
  meals,
  beverages
}: {
  childId: string;
  meals: MealDto[];
  beverages: BeverageDto[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function send(path: string, method: string, payload?: unknown) {
    const response = await fetch(path, {
      method,
      headers: { "content-type": "application/json", "x-csrf-token": csrf() },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });
    if (!response.ok) setMessage((await response.json())?.error?.message ?? "操作失败。");
    else { setMessage("已保存。"); router.refresh(); }
  }

  async function createMeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = nullableNumber(form, "amount");
    await send(`/api/children/${childId}/nutrition/meals`, "POST", {
      type: String(form.get("type")),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      source: "HOME",
      items: [{
        name: String(form.get("name")), consumedAmount: amount,
        amountUnit: amount === null ? null : String(form.get("unit")), isNewFood: false
      }]
    });
  }

  async function updateMeal(event: FormEvent<HTMLFormElement>, meal: MealDto) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send(`/api/children/${childId}/nutrition/meals/${meal.id}`, "PATCH", {
      type: String(form.get("type")),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      appetite: String(form.get("appetite") ?? "").trim() || null,
      notes: String(form.get("notes") ?? "").trim() || null,
      source: meal.source,
      items: meal.items.map((item, index) => ({
        name: String(form.get(`name-${index}`)),
        category: item.category,
        offeredAmount: item.offeredAmount,
        consumedAmount: nullableNumber(form, `consumed-${index}`),
        estimatedAmount: item.estimatedAmount,
        amountUnit: String(form.get(`unit-${index}`) ?? "").trim() || null,
        isNewFood: item.isNewFood,
        reactionNote: item.reactionNote
      }))
    });
  }

  async function createBeverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send(`/api/children/${childId}/nutrition/beverages`, "POST", {
      type: String(form.get("type")), volumeMl: nullableNumber(form, "volumeMl"),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(), source: "HOME"
    });
  }

  async function updateBeverage(event: FormEvent<HTMLFormElement>, beverage: BeverageDto) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await send(`/api/children/${childId}/nutrition/beverages/${beverage.id}`, "PATCH", {
      type: String(form.get("type")), volumeMl: nullableNumber(form, "volumeMl"),
      occurredAt: new Date(String(form.get("occurredAt"))).toISOString(),
      notes: String(form.get("notes") ?? "").trim() || null,
      source: beverage.source
    });
  }

  return <>
    <section className="profile-panel"><h2>添加餐食</h2><form className="growth-form" onSubmit={createMeal}><div className="form-grid">
      <label>餐次<select name="type">{mealTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>时间<input name="occurredAt" type="datetime-local" required defaultValue={local()} /></label>
      <label>食物<input name="name" required /></label>
      <label>实际摄入量<input name="amount" type="number" min="0" step="0.01" /></label>
      <label>单位<input name="unit" placeholder="g / ml / 份" /></label>
    </div><button className="primary-action profile-submit">添加餐食</button></form></section>

    <section className="profile-panel"><h2>添加饮品</h2><form className="growth-form" onSubmit={createBeverage}><div className="form-grid">
      <label>类型<select name="type">{beverageTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>时间<input name="occurredAt" type="datetime-local" required defaultValue={local()} /></label>
      <label>体积（ml，可不填）<input name="volumeMl" type="number" min="1" max="5000" /></label>
    </div><button className="primary-action profile-submit">添加饮品</button></form></section>
    {message ? <p className="form-message">{message}</p> : null}

    <section className="record-history"><h2>餐食历史</h2>{meals.slice().reverse().map((meal) =>
      <article className="record-card" key={meal.id}>
        <strong>{meal.type} · {new Date(meal.occurredAt).toLocaleString("zh-CN")}</strong>
        <p>{meal.items.map((item) => `${item.name}${item.consumedAmount === null ? "（数量未知）" : ` ${item.consumedAmount}${item.amountUnit ?? ""}`}`).join("、")}</p>
        {meal.deletedAt ? <button onClick={() => send(`/api/children/${childId}/nutrition/meals/${meal.id}/restore`, "POST")}>恢复</button> : <>
          <details><summary>编辑餐食</summary><form className="growth-form" onSubmit={(event) => updateMeal(event, meal)}><div className="form-grid">
            <label>餐次<select name="type" defaultValue={meal.type}>{mealTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>时间<input name="occurredAt" type="datetime-local" required defaultValue={local(new Date(meal.occurredAt))} /></label>
            <label>进食表现<input name="appetite" defaultValue={meal.appetite ?? ""} /></label>
            {meal.items.map((item, index) => <div className="form-grid" key={item.id}>
              <label>食物<input name={`name-${index}`} required defaultValue={item.name} /></label>
              <label>实际摄入量<input name={`consumed-${index}`} type="number" min="0" step="0.01" defaultValue={item.consumedAmount ?? ""} /></label>
              <label>单位<input name={`unit-${index}`} defaultValue={item.amountUnit ?? ""} /></label>
            </div>)}
          </div><label>备注<textarea name="notes" defaultValue={meal.notes ?? ""} /></label><button className="primary-action profile-submit">保存餐食修改</button></form></details>
          <button className="danger-action" onClick={() => send(`/api/children/${childId}/nutrition/meals/${meal.id}`, "DELETE")}>删除</button>
        </>}
      </article>)}</section>

    <section className="record-history"><h2>饮品历史</h2>{beverages.slice().reverse().map((beverage) =>
      <article className="record-card" key={beverage.id}>
        <strong>{beverage.type} · {beverage.volumeMl === null ? "数量未知" : `${beverage.volumeMl} ml`}</strong>
        <span>{new Date(beverage.occurredAt).toLocaleString("zh-CN")}</span>
        {beverage.deletedAt ? <button onClick={() => send(`/api/children/${childId}/nutrition/beverages/${beverage.id}/restore`, "POST")}>恢复</button> : <>
          <details><summary>编辑饮品</summary><form className="growth-form" onSubmit={(event) => updateBeverage(event, beverage)}><div className="form-grid">
            <label>类型<select name="type" defaultValue={beverage.type}>{beverageTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>时间<input name="occurredAt" type="datetime-local" required defaultValue={local(new Date(beverage.occurredAt))} /></label>
            <label>体积（ml，可不填）<input name="volumeMl" type="number" min="1" max="5000" defaultValue={beverage.volumeMl ?? ""} /></label>
          </div><label>备注<textarea name="notes" defaultValue={beverage.notes ?? ""} /></label><button className="primary-action profile-submit">保存饮品修改</button></form></details>
          <button className="danger-action" onClick={() => send(`/api/children/${childId}/nutrition/beverages/${beverage.id}`, "DELETE")}>删除</button>
        </>}
      </article>)}</section>
  </>;
}
