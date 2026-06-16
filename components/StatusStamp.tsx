import { STATUS_LABELS } from "@/lib/checks";

/**
 * The signature element: a check's status as an inked rubber stamp.
 * Green "נמסר" / vermilion "לא נמסר", double-ruled and slightly rotated.
 */
export default function StatusStamp({
  delivered,
  size = "md",
}: {
  delivered: boolean;
  size?: "sm" | "md";
}) {
  const cls = delivered ? "stamp stamp--valid" : "stamp stamp--pending";
  const sm = size === "sm" ? "!text-[0.62rem] !px-2 !py-0.5" : "";
  return (
    <span className={`${cls} ${sm}`}>
      {delivered ? STATUS_LABELS.delivered : STATUS_LABELS.not_delivered}
    </span>
  );
}
