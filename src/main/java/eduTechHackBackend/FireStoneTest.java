package eduTechHackBackend;
import com.google.cloud.firestore.Firestore;
import java.io.IOException;
public class FireStoneTest {
    public static void main(String[] args){
        try{
            Firestore db = FireStoneInitializer.getFirestore();
            System.out.println("This worked!!");
        } catch (IOException e) {
            System.out.println("This didn't work :( "+ e.getMessage());
        }
    }
}
