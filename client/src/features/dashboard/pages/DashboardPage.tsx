import AppLayout from "../../../shared/layouts/AppLayout";
import WelcomeBanner from "../components/WelcomeBanner";
import ScoreCard from "../components/ScoreCard";
import QuickActions from "../components/QuickActions";
import RecentAnalysis from "../components/RecentAnalysis";
import RecentJobDescriptions from "../components/RecentJobDescriptions";

function DashboardPage() {
  return (
    <AppLayout>
      <WelcomeBanner />

      <div className="grid gap-6 md:grid-cols-2">
        <ScoreCard
          title="Resume Score"
          score={82}
        />

        <ScoreCard
          title="ATS Score"
          score={76}
        />
      </div>

      <div className="mt-8">
        <QuickActions />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RecentAnalysis />
        <RecentJobDescriptions />
      </div>
    </AppLayout>
  );
}

export default DashboardPage;