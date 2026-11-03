import React from 'react';

import SimulationPlayer from '@/components/simulation/SimulationPlayer';
import { simulationFor } from '@/lib/simulations';
import { buildPayload, buildTranscript } from '@/lib/simulations/result';
import type { SimulationResult } from '@/lib/simulations/result';

import { ActivityData, SubmissionData } from './types';

interface SimulationStepProps {
  activityData?: ActivityData;
  submissionData: SubmissionData;
  setSubmissionData: (data: SubmissionData) => void;
  completed: boolean;
  onCompleted: () => void;
}

/**
 * The simulation, as a step in the activity.
 *
 * A finished run becomes an ordinary text submission: the transcript is what
 * the AI scorer reads, and the structured payload in `notes` is what the
 * assessor's evidence panel renders. Nothing downstream needs to know a
 * simulation produced it.
 */
const SimulationStep: React.FC<SimulationStepProps> = ({
  activityData,
  submissionData,
  setSubmissionData,
  completed,
  onCompleted,
}) => {
  const simulation = simulationFor(activityData?.activityDetail?.simulationKey);

  const handleComplete = (result: SimulationResult) => {
    setSubmissionData({
      ...submissionData,
      submissionType: 'TEXT',
      textContent: buildTranscript(result, simulation.title),
      notes: JSON.stringify(buildPayload(result, simulation.key, simulation.title)),
      file: undefined,
    });
    onCompleted();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-black">Simulation</h2>
      <SimulationPlayer simulation={simulation} onComplete={handleComplete} completed={completed} />
      {completed && (
        <p className="mt-3 text-sm text-green-700">
          Run recorded. Continue to Review, then submit.
        </p>
      )}
    </div>
  );
};

export default SimulationStep;
