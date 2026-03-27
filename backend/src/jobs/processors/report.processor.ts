import { Job } from 'bull';
export const processReportJob = async (job: Job) => {
  console.log('Processing report job:', job.id);
  return { success: true };
};
