package za.snapsend;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // This makes sure that the app draws behind the system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
