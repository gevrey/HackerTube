package ch.cri.hackertube;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;

import java.io.FileDescriptor;
import java.io.PrintWriter;

/** Optional, user-enabled Back shortcut for playback launched from HackerTube. */
public final class YouTubeBackService extends AccessibilityService {
    private static YouTubeBackService connected;
    private final YouTubeBackSession session = new YouTubeBackSession();
    private boolean consumingBack;

    static boolean isEnabled() { return connected != null; }
    static void arm() {
        if (connected != null) connected.session.arm(SystemClock.uptimeMillis());
    }
    static void clearSession() { if (connected != null) connected.session.clear(); }
    static void turnOff() {
        if (connected != null) {
            connected.session.clear();
            connected.disableSelf();
            connected = null;
        }
    }

    @Override protected void onServiceConnected() {
        // A restarted service cannot inherit an old playback session or seize an
        // independently opened YouTube app. Nothing is persisted or sent over the network.
        session.clear();
        consumingBack = false;
        connected = this;
    }

    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        // Only the window's owning package is used. Screen text and the view hierarchy
        // are unnecessary, and permission to retrieve them is not requested.
        CharSequence owner = event.getPackageName();
        session.windowChanged(owner == null ? null : owner.toString(), event.getEventTime());
    }

    @Override protected boolean onKeyEvent(KeyEvent event) {
        if (event.getKeyCode() != KeyEvent.KEYCODE_BACK) return false;
        if (event.getAction() == KeyEvent.ACTION_DOWN) {
            if (event.getRepeatCount() == 0) consumingBack = session.canReturn();
            return consumingBack;
        }
        if (event.getAction() != KeyEvent.ACTION_UP || !consumingBack) return false;
        consumingBack = false;
        // Consume the matching Up even if focus changed during a held key, but return
        // only if the same HackerTube-owned session is still active.
        boolean returnToApp = session.canReturn() && !event.isCanceled();
        session.clear();
        if (returnToApp) {
            // Reuse the activity and WebView to preserve the page, grid position, and
            // remote focus. The physical-device test also checks playback stops on exit.
            startActivity(new Intent(this, MainActivity.class).addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                            | Intent.FLAG_ACTIVITY_SINGLE_TOP));
        }
        return true;
    }

    @Override public void onInterrupt() { session.clear(); }
    @Override protected void dump(FileDescriptor fd, PrintWriter writer, String[] args) {
        // Read-only development diagnostics contain only current booleans, no key or app history.
        if (BuildConfig.DEBUG) writer.println("connected=" + (connected == this)
                + " canReturn=" + session.canReturn() + " consumingBack=" + consumingBack);
    }
    @Override public boolean onUnbind(Intent intent) {
        session.clear();
        consumingBack = false;
        if (connected == this) connected = null;
        return super.onUnbind(intent);
    }
    @Override public void onDestroy() {
        if (connected == this) connected = null;
        super.onDestroy();
    }
}
