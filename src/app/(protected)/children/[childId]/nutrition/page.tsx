import Link from "next/link";
import { notFound } from "next/navigation";

import { getPrisma } from "@/lib/db";
import { requireServerSession } from "@/modules/auth/server-session";
import { findChildForHousehold } from "@/modules/children/child-repository";
import { serializeBeverage, serializeMeal } from "@/modules/nutrition/nutrition-handlers";
import { summarizeNutrition } from "@/modules/nutrition/nutrition-record";
import { listBeveragesForChild, listMealsForChild } from "@/modules/nutrition/nutrition-repository";
import { dateInTimeZone } from "@/modules/sleep/sleep-record";
import { getHouseholdTimeZone } from "@/modules/sleep/sleep-repository";

import { NutritionClient } from "./nutrition-client";

export const dynamic = "force-dynamic";

export default async function NutritionPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  const auth = await requireServerSession();
  const prisma = getPrisma();
  const child = await findChildForHousehold(prisma, auth.householdId, childId);
  if (!child) notFound();

  const [storedMeals, storedDrinks, timeZone] = await Promise.all([
    listMealsForChild(prisma, auth.householdId, childId),
    listBeveragesForChild(prisma, auth.householdId, childId),
    getHouseholdTimeZone(prisma, auth.householdId)
  ]);
  const date = dateInTimeZone(new Date(), timeZone);
  const summary = summarizeNutrition(
    storedMeals.map((meal) => ({
      occurredAt: meal.occurredAt,
      itemCount: meal.items.filter((item) => !item.deletedAt).length
    })),
    storedDrinks.map((drink) => ({
      occurredAt: drink.occurredAt,
      type: drink.type,
      volumeMl: drink.volumeMl
    })),
    timeZone,
    date
  );

  return (
    <main className="profile-shell">
      <Link className="back-link" href={`/children/${childId}`}>← 返回 {child.name} 的档案</Link>
      <header className="profile-header compact">
        <h1>饮食与饮品</h1>
        <p>提供量、实际摄入量和估算量分别保存；未填写数量保持未知。</p>
      </header>
      <section className="snapshot-grid sleep-summary">
        <div className="snapshot-card peach"><span>今日餐次</span><strong>{summary.mealCount}</strong></div>
        <div className="snapshot-card blue"><span>奶 / 水</span><strong>{summary.milkMl} / {summary.waterMl} ml</strong></div>
      </section>
      <NutritionClient
        childId={childId}
        meals={storedMeals.map(serializeMeal)}
        beverages={storedDrinks.map(serializeBeverage)}
      />
    </main>
  );
}
