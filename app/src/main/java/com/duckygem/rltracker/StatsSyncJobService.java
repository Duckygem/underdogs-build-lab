package com.duckygem.rltracker;

import android.app.job.JobParameters;
import android.app.job.JobService;

public class StatsSyncJobService extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(() -> {
            try {
                if (!TrackerClient.getEpicName(this).isEmpty()) TrackerClient.fetchAndStore(this);
            } catch (Exception e) {
                TrackerClient.recordError(this, e.getMessage());
            } finally {
                jobFinished(params, false);
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
