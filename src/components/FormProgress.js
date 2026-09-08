function FormProgress({ currentStep, totalSteps, labels = [] }) {
  return (
    <div>
      <p className="ek-step-indicator">
        Step {currentStep} of {totalSteps}
      </p>
      <div className="ek-progress" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1;
          let className = 'ek-progress-step';
          if (stepNum < currentStep) className += ' active';
          if (stepNum === currentStep) className += ' active current';
          return (
            <div key={stepNum} className={className}>
              <span className="ek-progress-dot">{stepNum < currentStep ? '✓' : stepNum}</span>
              {labels[i] && <span className="ek-progress-label">{labels[i]}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FormProgress;
