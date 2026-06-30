import AppLayout from "../../../shared/layouts/AppLayout";
import Button from "../../../shared/components/ui/Button/Button";
import Card from "../../../shared/components/ui/Card/Card";

function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl font-bold">
            Welcome back, Bianca 👋
          </h2>

          <p className="mt-2 text-slate-600">
            Ready to improve your resume?
          </p>
        </div>

        <Card>
          <h3 className="text-xl font-semibold">
            Resume Score
          </h3>

          <p className="mt-4 text-5xl font-bold text-blue-600">
            82%
          </p>

          <div className="mt-6">
            <Button>
              Analyze Resume
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

export default DashboardPage;