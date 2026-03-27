import { Job } from 'bull';
export const processNotificationJob = async (job: Job) => {
  console.log('Processing notification job:', job.id);
  return { success: true };
};
