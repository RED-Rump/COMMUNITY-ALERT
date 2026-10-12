const labels = {
  scheduled: "Scheduled",
  emergency: "Emergency",
  resolved: "Resolved",
};

export default function SeverityBadge({ severity }) {
  return <span className={`severity-badge severity-${severity}`}>{labels[severity] ?? "Update"}</span>;
}
