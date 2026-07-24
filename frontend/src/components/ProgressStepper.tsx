interface ProgressStepperProps {
  totalSteps: number;
  currentStep: number; // 0-indexed
}

export function ProgressStepper({ totalSteps, currentStep }: ProgressStepperProps) {
  return (
    <div className="stepper" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={currentStep + 1}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <span
          key={index}
          className={
            index === currentStep
              ? "stepper-dot stepper-dot--active"
              : index < currentStep
                ? "stepper-dot stepper-dot--done"
                : "stepper-dot"
          }
        />
      ))}
    </div>
  );
}
