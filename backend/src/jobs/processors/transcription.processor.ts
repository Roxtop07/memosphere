import { Job } from 'bull';
export const processTranscriptionJob = async (job: Job) => {
  console.log('Processing transcription job:', job.id);
  return { success: true };
};
