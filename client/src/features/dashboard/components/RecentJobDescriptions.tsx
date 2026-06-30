import Card from "../../../shared/components/ui/Card/Card";

function RecentJobDescriptions() {
  return (
    <Card>
      <h3 className="text-lg font-semibold">
        Saved Job Descriptions
      </h3>

      <p className="mt-4 text-slate-500">
        No job descriptions yet.
      </p>
    </Card>
  );
}

export default RecentJobDescriptions;