import Button from "../../../shared/components/ui/Button/Button";

function QuickActions() {
  return (
    <div className="flex gap-4">
      <Button>Analyze Resume</Button>

      <Button variant="secondary">
        Upload Resume
      </Button>
    </div>
  );
}

export default QuickActions;