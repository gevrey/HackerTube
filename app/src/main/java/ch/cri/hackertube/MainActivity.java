package ch.cri.hackertube;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

/** Hosts the real website; the bundled adapter adds remote navigation without copying its data. */
public final class MainActivity extends Activity {
    private static final String HOME = "https://hackertube.org/";
    private WebView web;
    private FrameLayout root;
    private LinearLayout errorPanel;
    private TextView loading;
    private View customView;
    private WebChromeClient.CustomViewCallback customCallback;
    private String adapter;
    private String retryUrl = HOME;
    private boolean failed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16, 20, 28));
        setContentView(root);
        try {
            adapter = readAsset("navigation.js") + "\n" + readAsset("tv.js");
        } catch (IOException e) {
            throw new IllegalStateException("Bundled TV adapter missing", e);
        }
        createWebView();
        loading = new TextView(this);
        loading.setText(R.string.loading);
        loading.setTextColor(Color.WHITE);
        loading.setTextSize(24);
        loading.setGravity(Gravity.CENTER);
        root.addView(loading, new FrameLayout.LayoutParams(-1, -1));
        createErrorPanel();
        // Keep Back consistent for the DOM fullscreen player, WebView fullscreen, and SPA history.
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBack);
        }
        if (state == null || web.restoreState(state) == null) web.loadUrl(HOME);
    }

    private String readAsset(String name) throws IOException {
        try (var input = getAssets().open(name)) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(16, 20, 28));
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        WebSettings settings = web.getSettings();
        // HackerTube is a JavaScript application and stores preferences locally.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        // No JavaScript-to-Java bridge is exposed to the site or its embedded frames.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isSite(uri) && "/__tv_play".equals(uri.getPath())) {
                    String videoId = uri.getQueryParameter("v");
                    if (videoId != null && videoId.matches("[A-Za-z0-9_-]{11}")) {
                        startActivity(new Intent(MainActivity.this, PlayerActivity.class)
                                .putExtra("video_id", videoId)
                                .putExtra("captions_enabled", "1".equals(uri.getQueryParameter("captions"))));
                    }
                    return true;
                }
                if (isSite(uri)) return false;
                openExternal(uri);
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                failed = false;
                retryUrl = isSite(Uri.parse(url)) ? url : HOME;
                if (errorPanel != null) errorPanel.setVisibility(View.GONE);
                if (loading != null) loading.setVisibility(View.VISIBLE);
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (failed || !isSite(Uri.parse(url))) return;
                // The adapter is idempotent; it observes SPA routes after the initial injection.
                view.requestFocus();
                view.evaluateJavascript(adapter, null);
                loading.setVisibility(View.GONE);
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view;
                customCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(-1, -1));
                web.setVisibility(View.GONE);
                view.requestFocus();
            }
            @Override public void onHideCustomView() { closeCustomView(); }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
    }

    private static boolean isSite(Uri uri) {
        return "https".equals(uri.getScheme()) && "hackertube.org".equals(uri.getHost());
    }

    private void openExternal(Uri uri) {
        if (!"https".equals(uri.getScheme())) {
            Toast.makeText(this, R.string.blocked_link, Toast.LENGTH_SHORT).show();
            return;
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        String host = uri.getHost();
        // Prefer the TV YouTube player when the user explicitly selects the fallback link.
        if ("www.youtube.com".equals(host) || "youtube.com".equals(host) || "youtu.be".equals(host)) {
            try { startActivity(new Intent(intent).setPackage("com.google.android.youtube.tv")); return; }
            catch (ActivityNotFoundException ignored) { /* Try the system URL handler next. */ }
        }
        try { startActivity(intent); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.external_unavailable, Toast.LENGTH_LONG).show();
        }
    }

    private void createErrorPanel() {
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(48, 32, 48, 32);
        errorPanel.setBackgroundColor(Color.rgb(16, 20, 28));
        TextView message = new TextView(this);
        message.setText(R.string.load_error);
        message.setTextSize(22);
        message.setTextColor(Color.WHITE);
        errorPanel.addView(message);
        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(v -> web.loadUrl(retryUrl));
        errorPanel.addView(retry);
        Button home = new Button(this);
        home.setText(R.string.home);
        home.setOnClickListener(v -> web.loadUrl(HOME));
        errorPanel.addView(home);
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
    }

    private void showError() {
        failed = true;
        loading.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
        errorPanel.getChildAt(1).requestFocus();
    }

    private void closeCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        customCallback.onCustomViewHidden();
        customCallback = null;
        web.setVisibility(View.VISIBLE);
        web.requestFocus();
    }

    private void goBack() {
        if (customView != null) { closeCustomView(); return; }
        if (failed) { if (web.canGoBack()) web.goBack(); else finish(); return; }
        web.evaluateJavascript("Boolean(window.HackerTubeTV && HackerTubeTV.back())", handled -> {
            if ("true".equals(handled)) return;
            if (web.canGoBack()) web.goBack(); else finish();
        });
    }

    // API 33+ already uses OnBackInvokedDispatcher above. This override is only the older-TV fallback.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { goBack(); }

    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        String command = switch (event.getKeyCode()) {
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> "toggle";
            case KeyEvent.KEYCODE_MEDIA_PLAY -> "play";
            case KeyEvent.KEYCODE_MEDIA_PAUSE -> "pause";
            case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> "forward";
            case KeyEvent.KEYCODE_MEDIA_REWIND -> "rewind";
            default -> null;
        };
        if (command != null && !failed) {
            if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0)
                web.evaluateJavascript("window.HackerTubeTV && HackerTubeTV.media('" + command + "')", null);
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    @Override protected void onPause() {
        // Pause before handing off to YouTube or Home so audio cannot continue behind another app.
        web.evaluateJavascript("window.HackerTubeTV && HackerTubeTV.media('pause')", null);
        web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onSaveInstanceState(Bundle state) { web.saveState(state); super.onSaveInstanceState(state); }
    @Override protected void onDestroy() {
        closeCustomView();
        root.removeView(web);
        web.destroy();
        super.onDestroy();
    }
}
