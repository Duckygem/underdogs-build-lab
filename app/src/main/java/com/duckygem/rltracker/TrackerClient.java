package com.duckygem.rltracker;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class TrackerClient {
    public static final String PREFS = "ducky_rl_tracker";
    private static final String KEY_EPIC = "epic_name";
    private static final String KEY_RAW = "latest_raw";
    private static final String KEY_HISTORY = "history";
    private static final String KEY_LAST_ERROR = "last_error";
    private static final String KEY_LAST_SYNC = "last_sync";

    private TrackerClient() {}

    public static void setEpicName(Context context, String name) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_EPIC, name.trim()).apply();
    }

    public static String getEpicName(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString(KEY_EPIC, "");
    }

    public static String fetchAndStore(Context context) throws Exception {
        String epic = getEpicName(context);
        if (epic == null || epic.trim().isEmpty()) throw new Exception("Enter your Epic display name first.");

        String encoded = URLEncoder.encode(epic.trim(), StandardCharsets.UTF_8.name()).replace("+", "%20");
        URL url = new URL("https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/" + encoded);
        HttpURLConnection c = (HttpURLConnection) url.openConnection();
        c.setRequestMethod("GET");
        c.setConnectTimeout(15000);
        c.setReadTimeout(20000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("Accept", "application/json, text/plain, */*");
        c.setRequestProperty("Accept-Language", "en-US,en;q=0.9");
        c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 16; SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36");
        c.setRequestProperty("Referer", "https://rocketleague.tracker.network/");
        c.setRequestProperty("Origin", "https://rocketleague.tracker.network");
        c.connect();

        int code = c.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? c.getInputStream() : c.getErrorStream();
        String body = readAll(stream);
        c.disconnect();

        if (code < 200 || code >= 300) {
            throw new Exception("Stats provider returned HTTP " + code + ". Try Refresh again in a minute.");
        }

        JSONObject parsed = new JSONObject(body);
        if (!parsed.has("data") || parsed.isNull("data")) {
            String message = parsed.optString("message", "Profile not found. Check the Epic display name.");
            throw new Exception(message);
        }

        storeSnapshot(context, body, parsed.getJSONObject("data"));
        return packageForUi(context, true, null);
    }

    public static String packageForUi(Context context, boolean ok, String error) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject out = new JSONObject();
        try {
            out.put("ok", ok);
            out.put("epicName", p.getString(KEY_EPIC, ""));
            out.put("lastSync", p.getLong(KEY_LAST_SYNC, 0));
            String raw = p.getString(KEY_RAW, "");
            if (raw != null && !raw.isEmpty()) out.put("profile", new JSONObject(raw).getJSONObject("data"));
            else out.put("profile", JSONObject.NULL);
            String hist = p.getString(KEY_HISTORY, "[]");
            out.put("history", new JSONArray(hist));
            String e = error != null ? error : p.getString(KEY_LAST_ERROR, "");
            out.put("error", e == null ? "" : e);
        } catch (Exception e) {
            try { out.put("ok", false); out.put("error", e.getMessage()); } catch (Exception ignored) {}
        }
        return out.toString();
    }

    public static String cachedForUi(Context context) {
        return packageForUi(context, true, null);
    }

    public static void recordError(Context context, String error) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit().putString(KEY_LAST_ERROR, error == null ? "Unknown sync error" : error).apply();
    }

    private static void storeSnapshot(Context context, String raw, JSONObject data) throws Exception {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject snapshot = normalize(data);
        JSONArray history;
        try { history = new JSONArray(p.getString(KEY_HISTORY, "[]")); }
        catch (Exception ignored) { history = new JSONArray(); }

        boolean changed = true;
        if (history.length() > 0) {
            JSONObject last = history.optJSONObject(history.length() - 1);
            if (last != null) {
                String lastFingerprint = last.optString("fingerprint", "");
                String newFingerprint = snapshot.optString("fingerprint", "");
                changed = !newFingerprint.equals(lastFingerprint);
            }
        }
        if (changed) history.put(snapshot);

        while (history.length() > 192) {
            JSONArray trimmed = new JSONArray();
            for (int i = 1; i < history.length(); i++) trimmed.put(history.get(i));
            history = trimmed;
        }

        p.edit()
                .putString(KEY_RAW, raw)
                .putString(KEY_HISTORY, history.toString())
                .putString(KEY_LAST_ERROR, "")
                .putLong(KEY_LAST_SYNC, System.currentTimeMillis())
                .apply();
    }

    private static JSONObject normalize(JSONObject data) throws Exception {
        JSONObject snap = new JSONObject();
        long now = System.currentTimeMillis();
        snap.put("time", now);

        JSONObject ratings = new JSONObject();
        JSONObject totals = new JSONObject();
        JSONArray segments = data.optJSONArray("segments");
        int matchSum = 0;
        StringBuilder fp = new StringBuilder();

        if (segments != null) {
            for (int i = 0; i < segments.length(); i++) {
                JSONObject seg = segments.optJSONObject(i);
                if (seg == null) continue;
                String type = seg.optString("type", "");
                JSONObject stats = seg.optJSONObject("stats");
                if (stats == null) continue;

                if ("overview".equalsIgnoreCase(type)) {
                    copyStat(stats, totals, "wins");
                    copyStat(stats, totals, "mVPs");
                    copyStat(stats, totals, "goals");
                    copyStat(stats, totals, "assists");
                    copyStat(stats, totals, "saves");
                    copyStat(stats, totals, "shots");
                    copyStat(stats, totals, "goalShotRatio");
                    copyStat(stats, totals, "matchesPlayed");
                } else if ("playlist".equalsIgnoreCase(type)) {
                    JSONObject meta = seg.optJSONObject("metadata");
                    String name = meta == null ? "Playlist " + i : meta.optString("name", "Playlist " + i);
                    JSONObject r = new JSONObject();
                    r.put("rating", statValue(stats, "rating"));
                    r.put("matches", statValue(stats, "matchesPlayed"));
                    r.put("streak", statValue(stats, "winStreak"));
                    r.put("rank", nestedMeta(stats, "tier", "name"));
                    r.put("division", nestedMeta(stats, "division", "name"));
                    JSONObject attrs = seg.optJSONObject("attributes");
                    if (attrs != null) r.put("playlistId", attrs.optInt("playlistId", -1));
                    ratings.put(name, r);
                    matchSum += Math.max(0, r.optInt("matches", 0));
                    fp.append(name).append(':').append(r.optInt("rating", -1)).append(':').append(r.optInt("matches", 0)).append('|');
                }
            }
        }
        totals.put("playlistMatchSum", matchSum);
        fp.append("wins:").append(totals.optDouble("wins", 0)).append('|')
                .append("goals:").append(totals.optDouble("goals", 0)).append('|')
                .append("shots:").append(totals.optDouble("shots", 0));
        snap.put("ratings", ratings);
        snap.put("totals", totals);
        snap.put("fingerprint", fp.toString());
        return snap;
    }

    private static void copyStat(JSONObject stats, JSONObject out, String key) throws Exception {
        if (stats.has(key)) out.put(key, statDouble(stats, key));
    }

    private static int statValue(JSONObject stats, String key) {
        JSONObject o = stats.optJSONObject(key);
        if (o == null) return 0;
        return (int)Math.round(o.optDouble("value", 0));
    }

    private static double statDouble(JSONObject stats, String key) {
        JSONObject o = stats.optJSONObject(key);
        if (o == null) return 0;
        return o.optDouble("value", 0);
    }

    private static String nestedMeta(JSONObject stats, String key, String nestedKey) {
        JSONObject stat = stats.optJSONObject(key);
        if (stat == null) return "";
        JSONObject meta = stat.optJSONObject("metadata");
        return meta == null ? "" : meta.optString(nestedKey, "");
    }

    private static String readAll(InputStream in) throws Exception {
        if (in == null) return "";
        BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) sb.append(line).append('\n');
        br.close();
        return sb.toString();
    }
}
