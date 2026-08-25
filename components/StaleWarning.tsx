import { VERIFY_PERIODS } from "@/content/_schema";
import { Card } from "./Card";
import { Num } from "./Num";

/**
 * تنبيه بيظهر **لوحده** لما معلومة يعدي عليها أكتر من فترة مراجعتها.
 *
 * الفكرة إن الموقع لازم يفضل صح حتى لو صاحبه انشغل: المعلومة القديمة
 * بتحذّر من نفسها بدل ما تفضل معروضة كأنها لسه صح.
 */
export function StaleWarning({
  lastVerified,
  verifyIn,
  message,
}: {
  lastVerified: string;
  verifyIn: keyof typeof VERIFY_PERIODS;
  message: string;
}) {
  const days = VERIFY_PERIODS[verifyIn];
  const last = new Date(lastVerified);
  if (Number.isNaN(last.getTime())) return null;

  const age = (Date.now() - last.getTime()) / 86_400_000;
  if (age <= days) return null;

  return (
    <Card status="danger">
      <div className="p-4 text-sm">
        {message} <Num>{lastVerified}</Num>
      </div>
    </Card>
  );
}
