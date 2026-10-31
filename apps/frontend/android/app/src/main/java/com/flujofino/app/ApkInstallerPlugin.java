package com.flujofino.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
    private static final String TAG = "ApkInstaller";

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            ret.put("canInstall", canInstall);
        } else {
            ret.put("canInstall", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error abriendo ajustes de instalacion", e);
            call.reject("No se pudieron abrir los ajustes: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("URL del APK requerida");
            return;
        }

        // Ejecutar en hilo de fondo para no bloquear el WebView
        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            OutputStream output = null;

            try {
                Context context = getContext();
                File cacheDir = context.getExternalCacheDir();
                if (cacheDir == null) {
                    cacheDir = context.getCacheDir();
                }

                File apkFile = new File(cacheDir, "finowork_update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                URL url = new URL(apkUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setInstanceFollowRedirects(true);
                connection.connect();

                int responseCode = connection.getResponseCode();
                // Manejar posibles redirecciones HTTP 301 / 302
                if (responseCode == HttpURLConnection.HTTP_MOVED_PERM || responseCode == HttpURLConnection.HTTP_MOVED_TEMP) {
                    String newUrl = connection.getHeaderField("Location");
                    connection.disconnect();
                    url = new URL(newUrl);
                    connection = (HttpURLConnection) url.openConnection();
                    connection.connect();
                }

                long fileLength = connection.getContentLength();
                input = new BufferedInputStream(connection.getInputStream());
                output = new FileOutputStream(apkFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastProgressTime = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    // Notificar progreso a intervalos para no saturar el canal de eventos
                    long now = System.currentTimeMillis();
                    if (now - lastProgressTime > 150 && fileLength > 0) {
                        lastProgressTime = now;
                        int percent = (int) ((total * 100) / fileLength);
                        JSObject progressObj = new JSObject();
                        progressObj.put("progress", percent);
                        progressObj.put("downloaded", total);
                        progressObj.put("total", fileLength);
                        notifyListeners("downloadProgress", progressObj);
                    }
                }

                output.flush();

                // Notificar 100%
                JSObject finalProgress = new JSObject();
                finalProgress.put("progress", 100);
                finalProgress.put("downloaded", total);
                finalProgress.put("total", total);
                notifyListeners("downloadProgress", finalProgress);

                // Lanzar la instalación nativa
                launchInstaller(apkFile, call);

            } catch (Exception e) {
                Log.e(TAG, "Error descargando o instalando APK", e);
                call.reject("Error durante la descarga: " + e.getMessage());
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                } catch (Exception ignored) {}
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private void launchInstaller(File apkFile, PluginCall call) {
        try {
            Context context = getContext();

            // En Android 8.0+, si el usuario no ha concedido el permiso, abrir configuración
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.getPackageManager().canRequestPackageInstalls()) {
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + context.getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                }
            }

            Uri apkUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                apkFile
            );

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            context.startActivity(intent);

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error lanzando instalador de paquetes", e);
            call.reject("No se pudo iniciar el instalador: " + e.getMessage());
        }
    }
}
