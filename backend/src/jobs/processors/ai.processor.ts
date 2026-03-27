import { Job } from 'bull';
export const processAIJob = async (job: Job) => {
  console.log('Processing AI job:', job.id);
  return { success: true };
};
