package eduTechHackBackend;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

import java.io.FileInputStream;
import java.io.IOException;
@Configuration
public class FireStoneInitializer {
    private static Firestore db;
    @Bean
    public static Firestore getFirestore() throws IOException{
        if(db==null){
            FileInputStream serviceAccount = new FileInputStream("src/main/resources/serviceAccountKey.json");
            FirestoreOptions options = FirestoreOptions.newBuilder().setCredentials(GoogleCredentials.fromStream(serviceAccount)).build();
            db = options.getService();
        }
        return db;
    }
}
