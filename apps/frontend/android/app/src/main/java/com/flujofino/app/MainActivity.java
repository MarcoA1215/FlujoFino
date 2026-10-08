package com.flujofino.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final String TAG = "FinoWork";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
    Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
      @Override
      public void uncaughtException(Thread thread, Throwable throwable) {
        String msg = throwable != null ? throwable.getMessage() : "";
        if (msg != null && (msg.contains("Firebase") || msg.contains("FirebaseApp") || msg.contains("google-services"))) {
          Log.e(TAG, "Excepcion de Firebase suprimida de forma segura: " + msg, throwable);
          return;
        }
        if (defaultHandler != null) {
          defaultHandler.uncaughtException(thread, throwable);
        }
      }
    });
  }
}
