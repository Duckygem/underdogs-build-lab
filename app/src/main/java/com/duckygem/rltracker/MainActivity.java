package com.duckygem.rltracker;

import android.app.Activity;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int SYNC_JOB_ID = 24092026;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new NativeBridge(), "Android");
        webView.setBackgroundColor(0xFF07111F);
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
        scheduleBackgroundSync();
    }

    private void scheduleBackgroundSync() {
        JobScheduler scheduler = (JobScheduler)getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return;
        ComponentName service = new ComponentName(this, StatsSyncJobService.class);
        JobInfo job = new JobInfo.Builder(SYNC_JOB_ID, service)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(15 * 60 * 1000L)
                .setPersisted(false)
                .build();
        scheduler.schedule(job);
    }

    private void pushToWeb(final String payload) {
        runOnUiThread(() -> {
            if (webView != null) {
                String js = "window.DuckyRL&&window.DuckyRL.onNativePayload(" + JSONObject.quote(payload) + ");";
                webView.evaluateJavascript(js, null);
            }
        });
    }

    public class NativeBridge {
        @JavascriptInterface
        public void ready() {
            pushToWeb(TrackerClient.cachedForUi(MainActivity.this));
        }

        @JavascriptInterface
        public void connect(String epicName) {
            if (epicName == null || epicName.trim().isEmpty()) {
                pushToWeb(TrackerClient.packageForUi(MainActivity.this, false, "Enter your Epic display name."));
                return;
            }
            TrackerClient.setEpicName(MainActivity.this, epicName);
            scheduleBackgroundSync();
            refresh();
        }

        @JavascriptInterface
        public void refresh() {
            new Thread(() -> {
                try {
                    pushToWeb(TrackerClient.fetchAndStore(MainActivity.this));
                } catch (Exception e) {
                    TrackerClient.recordError(MainActivity.this, e.getMessage());
                    pushToWeb(TrackerClient.packageForUi(MainActivity.this, false, e.getMessage()));
                }
            }).start();
        }

        @JavascriptInterface
        public String getEpicName() {
            return TrackerClient.getEpicName(MainActivity.this);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
