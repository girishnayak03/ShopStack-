export default function AvailabilityBadge({ stockQty }) {
  let label = "In Stock";
  let background = "rgba(34, 197, 94, 0.15)";
  let color = "#22c55e";
  let border = "rgba(34, 197, 94, 0.4)";

  if (stockQty <= 0) {
    label = "Out of Stock";
    background = "rgba(239, 68, 68, 0.15)";
    color = "#ef4444";
    border = "rgba(239, 68, 68, 0.4)";
  } else if (stockQty <= 10) {
    label = "Low Stock";
    background = "rgba(245, 158, 11, 0.15)";
    color = "#f59e0b";
    border = "rgba(245, 158, 11, 0.4)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        background,
        color,
        border: `1px solid ${border}`,
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 700,
        whiteSpace: "nowrap"
      }}
    >
      {label}
    </span>
  );
}