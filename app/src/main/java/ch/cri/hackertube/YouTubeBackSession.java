package ch.cri.hackertube;

/** In-memory ownership of one YouTube launch, never a permanent remote-button remapping. */
final class YouTubeBackSession {
    static final String YOUTUBE = "com.google.android.youtube.tv";
    private static final String HACKERTUBE = "ch.cri.hackertube";
    private static final long LAUNCH_TIMEOUT_MS = 20_000;
    private boolean armed;
    private boolean inYouTube;
    private long launchedAt;

    void arm(long now) { armed = true; inYouTube = false; launchedAt = now; }
    void clear() { armed = false; inYouTube = false; }

    void windowChanged(String packageName, long now) {
        // Queued events from before this launch cannot establish or cancel ownership.
        if (!armed || packageName == null || now < launchedAt) return;
        if (!inYouTube && now - launchedAt > LAUNCH_TIMEOUT_MS) { clear(); return; }
        if (YOUTUBE.equals(packageName)) { inYouTube = true; return; }
        // Ignore the caller's final window event while YouTube is opening. Once YouTube
        // has appeared, leaving it for another app ends ownership, including Home.
        if (!inYouTube && HACKERTUBE.equals(packageName)) return;
        clear();
    }

    boolean canReturn() { return armed && inYouTube; }
}
