package ch.cri.hackertube;

/** Dependency-free checks for the shortcut's cross-app ownership boundary. */
public final class YouTubeBackSessionTest {
    public static void main(String[] args) {
        YouTubeBackSession session = new YouTubeBackSession();
        session.windowChanged(YouTubeBackSession.YOUTUBE, 10);
        check(!session.canReturn(), "Independent YouTube launch must keep normal Back");

        session.arm(100);
        check(!session.canReturn(), "Launch alone must not capture Back in HackerTube");
        session.windowChanged("com.google.android.apps.tv.launcherx", 99);
        session.windowChanged("ch.cri.hackertube", 101);
        session.windowChanged(YouTubeBackSession.YOUTUBE, 110);
        check(session.canReturn(), "Owned YouTube launch must enable return despite queued old events");
        session.windowChanged(YouTubeBackSession.YOUTUBE, 3_600_100);
        check(session.canReturn(), "Long playback must remain owned");

        session.windowChanged("com.google.android.apps.tv.launcherx", 3_600_110);
        session.windowChanged(YouTubeBackSession.YOUTUBE, 3_600_120);
        check(!session.canReturn(), "Home then reopening YouTube must not reuse ownership");

        session.arm(4_000_000);
        session.windowChanged("com.android.tv.settings", 4_000_010);
        session.windowChanged(YouTubeBackSession.YOUTUBE, 4_000_020);
        check(!session.canReturn(), "An intervening app must cancel a pending launch");

        session.arm(5_000_000);
        session.windowChanged(YouTubeBackSession.YOUTUBE, 5_020_001);
        check(!session.canReturn(), "A failed launch must not capture a later YouTube session");

        session.arm(6_000_000);
        session.windowChanged(YouTubeBackSession.YOUTUBE, 6_000_010);
        session.clear();
        session.windowChanged(YouTubeBackSession.YOUTUBE, 6_000_020);
        check(!session.canReturn(), "Returning or disabling must end ownership");
        System.out.println("YouTube Back ownership checks passed");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
