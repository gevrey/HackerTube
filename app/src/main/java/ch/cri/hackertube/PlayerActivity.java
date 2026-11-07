package ch.cri.hackertube;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** App-owned fullscreen host for the official YouTube player, with native remote controls. */
public final class PlayerActivity extends Activity {
    private WebView player;
    private String videoId;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        videoId = getIntent().getStringExtra("video_id");
        if (videoId == null || !videoId.matches("[A-Za-z0-9_-]{11}")) { finish(); return; }
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(16, 20, 28));
        setContentView(root);
        player = new WebView(this);
        player.setBackgroundColor(Color.BLACK);
        player.setFocusableInTouchMode(true);
        WebSettings settings = player.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        // Opening this activity is the user's explicit Play action.
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(player, true);
        player.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                // The player document is bundled. Links from the embedded player use YouTube's app.
                openYouTube();
                return true;
            }
        });
        root.addView(player, new LinearLayout.LayoutParams(-1, 0, 1));
        try {
            String html;
            try (var input = getAssets().open("player.html")) {
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) bytes.write(buffer, 0, count);
                html = bytes.toString(StandardCharsets.UTF_8.name()).replace("VIDEO_ID_PLACEHOLDER", videoId);
            }
            // YouTube requires the embedding app's identity as the WebView referrer.
            // The package-name origin identifies this app, not HackerTube's website.
            String base = "https://" + getPackageName() + "/";
            player.loadDataWithBaseURL(base, html, "text/html", "UTF-8", base);
        } catch (IOException e) { throw new IllegalStateException("Player asset missing", e); }
        player.requestFocus();
    }

    private void command(String action) {
        player.evaluateJavascript("window.tvPlayer && tvPlayer.command('" + action + "')", null);
    }
    private void openYouTube() {
        command("pause");
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/watch?v=" + videoId));
        try { startActivity(new Intent(intent).setPackage("com.google.android.youtube.tv")); }
        catch (ActivityNotFoundException e) {
            try { startActivity(intent); }
            catch (ActivityNotFoundException unavailable) {
                Toast.makeText(this, R.string.external_unavailable, Toast.LENGTH_LONG).show();
            }
        }
    }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        int key = event.getKeyCode();
        String action = switch (key) {
            case KeyEvent.KEYCODE_MEDIA_PLAY -> "play";
            case KeyEvent.KEYCODE_MEDIA_PAUSE -> "pause";
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> "toggle";
            case KeyEvent.KEYCODE_MEDIA_REWIND -> "rewind";
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> "forward";
            case KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> "toggle";
            case KeyEvent.KEYCODE_DPAD_LEFT -> "rewind";
            case KeyEvent.KEYCODE_DPAD_RIGHT -> "forward";
            default -> null;
        };
        if (action != null) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) command(action);
            return true;
        }
        // Up and Down have no player UI to reveal. Consume them to keep the video undisturbed.
        if (key == KeyEvent.KEYCODE_DPAD_UP || key == KeyEvent.KEYCODE_DPAD_DOWN) return true;
        return super.dispatchKeyEvent(event);
    }
    @Override protected void onPause() {
        if (player != null) { command("pause"); player.onPause(); }
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (player != null) player.onResume(); }
    @Override protected void onDestroy() {
        if (player != null) { ((LinearLayout) player.getParent()).removeView(player); player.destroy(); }
        super.onDestroy();
    }
}
