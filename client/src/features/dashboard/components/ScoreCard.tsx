import Card from "../../../shared/components/ui/Card/Card";

type ScoreCardProps = {
  title: string;
  score: number;
};

function ScoreCard({
  title,
  score,
}: ScoreCardProps) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      <div className="mt-6 text-center">
        <p className="text-5xl font-bold text-blue-600">
          {score}%
        </p>
      </div>
    </Card>
  );
}

export default ScoreCard;