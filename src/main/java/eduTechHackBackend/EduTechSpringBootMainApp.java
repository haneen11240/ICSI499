package eduTechHackBackend;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EduTechSpringBootMainApp {
    public static void main(String[] args){
        SpringApplication.run(EduTechSpringBootMainApp.class, args);
        System.out.println("SpringBoot App is Working");
    }
}
